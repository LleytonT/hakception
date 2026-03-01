import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPersonality } from "@/lib/ai/personalities";
import { runAgent } from "@/lib/ai/agent";
import type { Tournament, AgentRun } from "@/lib/supabase/types";

export const maxDuration = 300; // 5 minute timeout

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

  // Run agent directly (not via workflow — for local testing)
  const result = await runAgent({
    agentRunId: agentRun.id,
    tournamentId: tournament.id,
    hackathonId: hackathon_id,
    agentNumber: agent_number,
  });

  // Update tournament status
  await supabase
    .from("tournaments")
    .update({
      status: result.success
        ? ("completed" as const)
        : ("failed" as const),
      completed_at: new Date().toISOString(),
      ...(result.success ? { winner_agent_run_id: agentRun.id } : {}),
    })
    .eq("id", tournament.id);

  return NextResponse.json({
    tournament_id: tournament.id,
    agent_run_id: agentRun.id,
    result,
  });
}
