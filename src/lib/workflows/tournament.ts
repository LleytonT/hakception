import { start } from "workflow/api";
import type { AgentResult } from "@/lib/ai/agent";
import { agentRunWorkflow } from "@/lib/workflows/agent-run";

const AGENT_COUNT = 10;

export async function tournamentWorkflow(
  tournamentId: string,
  hackathonId: string
): Promise<{ results: (AgentResult | null)[]; successCount: number }> {
  "use workflow";

  // Step 1: Create agent_runs and get their IDs
  const agentRunIds = await createAgentRuns(tournamentId);

  // Step 2: Update tournament to running
  await markTournamentRunning(tournamentId);

  // Step 3: Launch all 10 agents in parallel, await results
  const results = await runAllAgents(agentRunIds, tournamentId, hackathonId);

  // Step 4: Finalize tournament
  const successCount = results.filter((r) => r?.success).length;
  await finalizeTournament(tournamentId, successCount);

  return { results, successCount };
}

async function createAgentRuns(tournamentId: string): Promise<string[]> {
  "use step";

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { getPersonality } = await import("@/lib/ai/personalities");
  const supabase = createAdminClient();

  const rows = Array.from({ length: AGENT_COUNT }, (_, i) => {
    const agentNumber = i + 1;
    const personality = getPersonality(agentNumber);
    return {
      tournament_id: tournamentId,
      agent_number: agentNumber,
      personality: personality.name,
      status: "pending" as const,
    };
  });

  const { data, error } = await supabase
    .from("agent_runs")
    .insert(rows)
    .select("id, agent_number")
    .order("agent_number", { ascending: true });

  if (error) throw new Error(`Failed to create agent_runs: ${error.message}`);

  return (data ?? []).map((r) => r.id);
}

async function markTournamentRunning(tournamentId: string): Promise<void> {
  "use step";

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  await supabase
    .from("tournaments")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", tournamentId);
}

async function runAllAgents(
  agentRunIds: string[],
  tournamentId: string,
  hackathonId: string
): Promise<(AgentResult | null)[]> {
  "use step";

  const runs = await Promise.all(
    agentRunIds.map((agentRunId, i) =>
      start(agentRunWorkflow, [agentRunId, tournamentId, hackathonId, i + 1])
    )
  );

  const results = await Promise.all(
    runs.map((run) =>
      run.returnValue.catch((err: unknown) => {
        console.error(`[tournament] agent workflow failed:`, err);
        return null;
      })
    )
  );

  return results;
}

async function finalizeTournament(
  tournamentId: string,
  successCount: number
): Promise<void> {
  "use step";

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const status = successCount > 0 ? "completed" : "failed";

  // Find the first successful agent to mark as winner (human can override later)
  let winnerAgentRunId: string | null = null;
  if (successCount > 0) {
    const { data } = await supabase
      .from("agent_runs")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("status", "completed")
      .limit(1)
      .single();
    winnerAgentRunId = data?.id ?? null;
  }

  await supabase
    .from("tournaments")
    .update({
      status,
      completed_at: new Date().toISOString(),
      winner_agent_run_id: winnerAgentRunId,
    })
    .eq("id", tournamentId);
}
