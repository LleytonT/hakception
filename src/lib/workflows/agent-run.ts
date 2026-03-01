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
