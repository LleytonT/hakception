import { Sandbox } from "@vercel/sandbox";

function getSandboxCredentials() {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (token && teamId && projectId) {
    return { token, teamId, projectId };
  }
  return {};
}

export type SandboxRuntime = "node24" | "python3.13";

export interface FileChange {
  path: string;
  content: string;
}

export interface SandboxResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  sandboxId: string;
  runtime: SandboxRuntime;
}

async function detectRuntime(sandbox: Sandbox): Promise<SandboxRuntime> {
  const pkgJson = await sandbox.readFileToBuffer({ path: "package.json" });
  if (pkgJson) return "node24";

  const reqTxt = await sandbox.readFileToBuffer({ path: "requirements.txt" });
  if (reqTxt) return "python3.13";

  const pyproject = await sandbox.readFileToBuffer({ path: "pyproject.toml" });
  if (pyproject) return "python3.13";

  return "node24";
}

async function installDeps(
  sandbox: Sandbox,
  runtime: SandboxRuntime
): Promise<{ exitCode: number; output: string }> {
  if (runtime === "node24") {
    const result = await sandbox.runCommand({
      cmd: "npm",
      args: ["install", "--legacy-peer-deps"],
      cwd: "/vercel/sandbox",
      signal: AbortSignal.timeout(120_000),
    });
    return {
      exitCode: result.exitCode,
      output: await result.output("both"),
    };
  }

  const result = await sandbox.runCommand({
    cmd: "pip",
    args: ["install", "-r", "requirements.txt"],
    cwd: "/vercel/sandbox",
    signal: AbortSignal.timeout(120_000),
  });
  return {
    exitCode: result.exitCode,
    output: await result.output("both"),
  };
}

export async function executeSandbox(params: {
  gitUrl: string;
  files: FileChange[];
  testCommand: { cmd: string; args: string[] };
}): Promise<SandboxResult> {
  const { gitUrl, files, testCommand } = params;

  const credentials = getSandboxCredentials();

  // Create sandbox with git clone (node24 default — has git pre-installed)
  const sandbox = await Sandbox.create({
    source: { type: "git", url: gitUrl, depth: 1 },
    runtime: "node24",
    timeout: 300_000,
    ...credentials,
  });

  try {
    // Detect actual runtime needed
    const runtime = await detectRuntime(sandbox);

    // If Python project, we need to recreate with python3.13 runtime
    if (runtime === "python3.13") {
      await sandbox.stop({ blocking: true });

      const pythonSandbox = await Sandbox.create({
        source: { type: "git", url: gitUrl, depth: 1 },
        runtime: "python3.13",
        timeout: 300_000,
        ...credentials,
      });

      return await runInSandbox(pythonSandbox, runtime, files, testCommand);
    }

    return await runInSandbox(sandbox, runtime, files, testCommand);
  } catch (error) {
    // If something fails before runInSandbox, still clean up
    await sandbox.stop({ blocking: true }).catch(() => {});
    throw error;
  }
}

async function runInSandbox(
  sandbox: Sandbox,
  runtime: SandboxRuntime,
  files: FileChange[],
  testCommand: { cmd: string; args: string[] }
): Promise<SandboxResult> {
  try {
    // Install dependencies (don't fail on install errors — some projects have broken deps)
    await installDeps(sandbox, runtime).catch(() => {});

    // Apply file changes
    if (files.length > 0) {
      await sandbox.writeFiles(
        files.map((f) => ({
          path: f.path.startsWith("/")
            ? f.path
            : `/vercel/sandbox/${f.path}`,
          content: Buffer.from(f.content, "utf-8"),
        }))
      );
    }

    // Run test command
    const testResult = await sandbox.runCommand({
      cmd: testCommand.cmd,
      args: testCommand.args,
      cwd: "/vercel/sandbox",
      signal: AbortSignal.timeout(60_000),
    });

    const stdout = await testResult.stdout();
    const stderr = await testResult.stderr();

    return {
      success: testResult.exitCode === 0,
      exitCode: testResult.exitCode,
      stdout: stdout.slice(0, 4000),
      stderr: stderr.slice(0, 4000),
      sandboxId: sandbox.sandboxId,
      runtime,
    };
  } finally {
    await sandbox.stop({ blocking: true }).catch(() => {});
  }
}
