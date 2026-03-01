import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPersonality } from "@/lib/ai/personalities";
import { agentRunWorkflow } from "@/lib/workflows/agent-run";
import type { Tournament, AgentRun } from "@/lib/supabase/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { hackathon_id, agent_number = 1 } = body;

  if (!hackathon_id) {
    return NextResponse.json(
      { error: "hackathon_id required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Create tournament
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .insert({
      hackathon_id,
      status: "running" as const,
      agent_count: 1,
    })
    .select()
    .single<Tournament>();

  if (tErr || !tournament) {
    return NextResponse.json(
      { error: tErr?.message ?? "Failed to create tournament" },
      { status: 500 }
    );
  }

  // Create agent_run record
  const personality = getPersonality(agent_number);

  const { data: agentRun, error: aErr } = await supabase
    .from("agent_runs")
    .insert({
      tournament_id: tournament.id,
      agent_number,
      personality: personality.name,
      status: "pending" as const,
    })
    .select()
    .single<AgentRun>();

  if (aErr || !agentRun) {
    return NextResponse.json(
      { error: aErr?.message ?? "Failed to create agent run" },
      { status: 500 }
    );
  }

  // Start workflow (fire-and-forget — returns immediately)
  const run = await start(agentRunWorkflow, [
    agentRun.id,
    tournament.id,
    hackathon_id,
    agent_number,
  ]);

  return NextResponse.json({
    tournament_id: tournament.id,
    agent_run_id: agentRun.id,
    workflow_run_id: run.runId,
  });
}
