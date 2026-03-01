import { generateText, stepCountIs } from "ai";
import { agentModel } from "@/lib/ai/model";
import { getPersonality } from "@/lib/ai/personalities";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchProjects } from "@/lib/tools/search-projects";
import { getProjectDetails } from "@/lib/tools/get-project-details";
import { fetchSponsorDocs } from "@/lib/tools/fetch-sponsor-docs";
import { submitPlan } from "@/lib/tools/submit-plan";
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
  let selectedProjectId: number | null = null;
  let selectedSponsorId: string | null = null;

  const systemPrompt = `${personality.systemPrompt}

You are an AI agent competing in a hackathon tournament. Your goal is to create an integration plan for combining a sponsor's API with an existing hackathon project.

## Steps
1. Search for projects using search_projects (describe what you want in natural language) and get_project_details. Pick one with a GitHub repo.
2. Read sponsor docs using fetch_sponsor_docs.
3. Submit your integration plan using submit_plan. This is your final deliverable.

## Available Sponsors
${sponsorList}

## Rules
- Call submit_plan EXACTLY ONCE with a thorough integration plan.
- Your plan should be a high-level blueprint: which files to modify, what API endpoints to use, and how to wire them together.
- The plan will be handed to a coding agent to implement, so be specific about architecture but don't write full code.
- search_projects returns a github_url field (the first repo URL).
- get_project_details also returns github_url (first URL) and the full github_urls array.`;

  updateAgentStatus(ctx.agentRunId, "selecting");

  try {
    await generateText({
      model: agentModel,
      system: systemPrompt,
      prompt:
        "Begin your hackathon agent run. Search for projects, select one, research the sponsor, then create and submit your integration plan.",
      tools: {
        search_projects: searchProjects,
        get_project_details: getProjectDetails,
        fetch_sponsor_docs: fetchSponsorDocs,
        submit_plan: submitPlan,
      },
      stopWhen: stepCountIs(15),
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

    const finalStatus: AgentRunStatus = planSubmitted
      ? "completed"
      : "failed";

    // Final status update — await this one since it's the last thing we do
    const finalSupabase = createAdminClient();
    await finalSupabase
      .from("agent_runs")
      .update({ status: finalStatus })
      .eq("id", ctx.agentRunId);

    return {
      success: planSubmitted,
      planSubmitted,
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
      selectedProjectId,
      selectedSponsorId,
      error: errorMsg,
    };
  }
}
