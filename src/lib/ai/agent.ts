import { generateText, stepCountIs } from "ai";
import { agentModel } from "@/lib/ai/model";
import { getPersonality } from "@/lib/ai/personalities";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchProjects } from "@/lib/tools/search-projects";
import { getProjectDetails } from "@/lib/tools/get-project-details";
import { fetchSponsorDocs } from "@/lib/tools/fetch-sponsor-docs";
import { submitPlan } from "@/lib/tools/submit-plan";
import { writeAndTestCode } from "@/lib/tools/write-and-test";
import type { AgentRunStatus } from "@/lib/supabase/types";

export interface AgentContext {
  agentRunId: string;
  tournamentId: string;
  hackathonId: string;
  agentNumber: number;
}

export interface AgentResult {
  success: boolean;
  planSubmitted: boolean;
  sandboxPassed: boolean;
  selectedProjectId: number | null;
  selectedSponsorId: string | null;
  error?: string;
}

function updateAgentStatus(
  agentRunId: string,
  status: AgentRunStatus,
  extra?: Record<string, unknown>
) {
  const supabase = createAdminClient();
  supabase
    .from("agent_runs")
    .update({ status, ...extra })
    .eq("id", agentRunId)
    .then(({ error }) => {
      if (error) console.error("[agent] status update failed:", error.message);
    });
}

function logStep(params: {
  agentRunId: string;
  stepNumber: number;
  stepType: "tool_call" | "llm_response" | "error";
  toolName?: string;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  durationMs?: number;
}) {
  const supabase = createAdminClient();
  supabase
    .from("agent_steps")
    .insert({
      agent_run_id: params.agentRunId,
      step_number: params.stepNumber,
      step_type: params.stepType,
      tool_name: params.toolName ?? null,
      input: params.input ?? null,
      output: params.output ?? null,
      duration_ms: params.durationMs != null ? Math.round(params.durationMs) : null,
    })
    .then(({ error }) => {
      if (error) console.error("[agent] step log failed:", error.message);
    });
}

export async function runAgent(ctx: AgentContext): Promise<AgentResult> {
  const personality = getPersonality(ctx.agentNumber);
  const supabase = createAdminClient();

  // Fetch sponsors for this hackathon
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select("id, name, description")
    .eq("hackathon_id", ctx.hackathonId);

  const sponsorList = (sponsors ?? [])
    .map(
      (s) =>
        `- ${s.name} (ID: ${s.id}): ${s.description ?? "No description"}`
    )
    .join("\n");

  // Track state across callbacks
  let stepCounter = 0;
  let planSubmitted = false;
  let sandboxPassed = false;
  let selectedProjectId: number | null = null;
  let selectedSponsorId: string | null = null;
  let lastCodeChanges: Record<string, string> | null = null;

  const systemPrompt = `${personality.systemPrompt}

You are an AI agent competing in a hackathon tournament. Your goal is to integrate a sponsor's API into an existing hackathon project.

## Steps
1. Search for projects using search_projects (describe what you want in natural language) and get_project_details. Pick one with a GitHub repo.
2. Read sponsor docs using fetch_sponsor_docs.
3. Submit your plan using submit_plan (REQUIRED before writing code).
4. Write code and test using write_and_test_code.

## Available Sponsors
${sponsorList}

## Rules
- Call submit_plan EXACTLY ONCE before calling write_and_test_code.
- Provide FULL file content in write_and_test_code (not diffs).
- Use build verification as your test command:
  - Node.js projects: "npm run build" or "node -e \\"require('./your-file')\\""
  - Python projects: "python -m py_compile your_file.py"
- If the build fails, you may retry with fixed code (you have up to 30 steps total).
- search_projects returns a github_url field (the first repo URL). Use this as the git_url in write_and_test_code.
- get_project_details also returns github_url (first URL) and the full github_urls array.`;

  updateAgentStatus(ctx.agentRunId, "selecting");

  try {
    const result = await generateText({
      model: agentModel,
      system: systemPrompt,
      prompt:
        "Begin your hackathon agent run. Search for projects, select one, research the sponsor, make a plan, then write and test your integration code.",
      tools: {
        search_projects: searchProjects,
        get_project_details: getProjectDetails,
        fetch_sponsor_docs: fetchSponsorDocs,
        submit_plan: submitPlan,
        write_and_test_code: writeAndTestCode,
      },
      stopWhen: stepCountIs(30),
      maxRetries: 2,

      experimental_onToolCallStart: ({ toolCall }) => {
        try {
          const toolName = toolCall.toolName;
          console.log(`[agent] tool start: ${toolName}`);
          if (
            toolName === "search_projects" ||
            toolName === "get_project_details"
          ) {
            updateAgentStatus(ctx.agentRunId, "selecting");
          } else if (toolName === "fetch_sponsor_docs") {
            updateAgentStatus(ctx.agentRunId, "researching");
          } else if (toolName === "submit_plan") {
            updateAgentStatus(ctx.agentRunId, "planning");
          } else if (toolName === "write_and_test_code") {
            updateAgentStatus(ctx.agentRunId, "coding");
          }
        } catch (err) {
          console.error("[agent] onToolCallStart error:", err);
        }
      },

      experimental_onToolCallFinish: (event) => {
        try {
          stepCounter++;
          const toolName = event.toolCall.toolName;
          const success = event.success;

          console.log(
            `[agent] tool finish: ${toolName} success=${success} (${event.durationMs}ms)`
          );

          if (toolName === "submit_plan" && success) {
            planSubmitted = true;
            const output = event.output as Record<string, unknown>;
            selectedProjectId = output.project_id as number;
            selectedSponsorId = output.sponsor_id as string;

            updateAgentStatus(ctx.agentRunId, "planning", {
              selected_project_id: selectedProjectId,
              selected_sponsor_id: selectedSponsorId,
              extension_plan: output.plan_summary as string,
            });
          }

          if (toolName === "write_and_test_code") {
            const input = event.toolCall.input as Record<string, unknown>;
            const files = input.files as Array<{
              path: string;
              content: string;
            }>;
            if (files) {
              lastCodeChanges = Object.fromEntries(
                files.map((f) => [f.path, f.content])
              );
            }

            if (success) {
              const output = event.output as Record<string, unknown>;
              if (output.success === true) {
                sandboxPassed = true;
              }
              updateAgentStatus(ctx.agentRunId, "testing", {
                sandbox_result: output,
                sandbox_id: (output.sandbox_id as string) ?? null,
                code_changes: lastCodeChanges,
              });
            }
          }

          // Log the step to Supabase
          let outputForLog: Record<string, unknown> | null;
          if (success) {
            const raw = event.output;
            outputForLog =
              raw && typeof raw === "object" && !Array.isArray(raw)
                ? (raw as Record<string, unknown>)
                : { value: raw };
          } else {
            outputForLog = { error: String(event.error) };
          }

          logStep({
            agentRunId: ctx.agentRunId,
            stepNumber: stepCounter,
            stepType: success ? "tool_call" : "error",
            toolName,
            input: event.toolCall.input as Record<string, unknown>,
            output: outputForLog,
            durationMs: event.durationMs,
          });
        } catch (err) {
          console.error("[agent] onToolCallFinish error:", err);
        }
      },

      onStepFinish: (stepResult) => {
        try {
          if (stepResult.text) {
            stepCounter++;
            logStep({
              agentRunId: ctx.agentRunId,
              stepNumber: stepCounter,
              stepType: "llm_response",
              output: { text: stepResult.text.slice(0, 2000) },
            });
          }
        } catch (err) {
          console.error("[agent] onStepFinish error:", err);
        }
      },
    });

    const finalStatus: AgentRunStatus = sandboxPassed
      ? "completed"
      : "failed";

    // Final status update — await this one since it's the last thing we do
    const finalSupabase = createAdminClient();
    await finalSupabase
      .from("agent_runs")
      .update({ status: finalStatus, code_changes: lastCodeChanges })
      .eq("id", ctx.agentRunId);

    return {
      success: sandboxPassed,
      planSubmitted,
      sandboxPassed,
      selectedProjectId,
      selectedSponsorId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[agent] fatal error:", errorMsg);

    const errSupabase = createAdminClient();
    await errSupabase
      .from("agent_runs")
      .update({ status: "failed" as AgentRunStatus, error: errorMsg })
      .eq("id", ctx.agentRunId);

    return {
      success: false,
      planSubmitted,
      sandboxPassed,
      selectedProjectId,
      selectedSponsorId,
      error: errorMsg,
    };
  }
}
