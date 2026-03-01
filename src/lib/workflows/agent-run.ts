import type { AgentContext, AgentResult } from "@/lib/ai/agent";

export async function agentRunWorkflow(
  agentRunId: string,
  tournamentId: string,
  hackathonId: string,
  agentNumber: number
): Promise<AgentResult> {
  "use workflow";

  const result = await executeAgentRun(
    agentRunId,
    tournamentId,
    hackathonId,
    agentNumber
  );

  await updateTournamentStatus(tournamentId, agentRunId, result);

  return result;
}

async function executeAgentRun(
  agentRunId: string,
  tournamentId: string,
  hackathonId: string,
  agentNumber: number
): Promise<AgentResult> {
  "use step";

  const { runAgent } = await import("@/lib/ai/agent");

  const ctx: AgentContext = {
    agentRunId,
    tournamentId,
    hackathonId,
    agentNumber,
  };

  return runAgent(ctx);
}

async function updateTournamentStatus(
  tournamentId: string,
  agentRunId: string,
  result: AgentResult
): Promise<void> {
  "use step";

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  await supabase
    .from("tournaments")
    .update({
      status: result.success ? "completed" : ("failed" as const),
      completed_at: new Date().toISOString(),
      ...(result.success ? { winner_agent_run_id: agentRunId } : {}),
    })
    .eq("id", tournamentId);
}
