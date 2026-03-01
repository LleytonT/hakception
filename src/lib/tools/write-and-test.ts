import { tool } from "ai";
import { z } from "zod";
import { executeSandbox, type FileChange } from "@/lib/sandbox/executor";

export const writeAndTestCode = tool({
  description:
    "Apply file changes to the project in a sandbox and run a build/test command. " +
    "Provide the FULL content for each file you want to create or modify. " +
    "The sandbox clones the project repo fresh, installs deps, applies your changes, " +
    "then runs the test command. Returns pass/fail with stdout and stderr. " +
    "Use 'npm run build' for Node.js projects or 'python -c \"import <module>\"' for Python.",
  inputSchema: z.object({
    git_url: z
      .string()
      .url()
      .describe("The GitHub repo URL to clone"),
    files: z
      .array(
        z.object({
          path: z
            .string()
            .describe(
              "File path relative to repo root (e.g. 'src/api.js')"
            ),
          content: z.string().describe("Full file content to write"),
        })
      )
      .min(1)
      .describe("Files to create or overwrite in the repo"),
    test_command: z
      .string()
      .default("npm run build")
      .describe(
        "Command to verify the changes (e.g. 'npm run build', 'python -m py_compile file.py')"
      ),
  }),
  execute: async ({ git_url, files, test_command }) => {
    const parts = test_command.split(" ");
    const cmd = parts[0];
    const args = parts.slice(1);

    const result = await executeSandbox({
      gitUrl: git_url,
      files: files as FileChange[],
      testCommand: { cmd, args },
    });

    return {
      success: result.success,
      exit_code: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      runtime: result.runtime,
      sandbox_id: result.sandboxId,
    };
  },
});
