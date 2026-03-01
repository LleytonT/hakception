import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; agentRunId: string }>;
  }
) {
  const { id: tournamentId, agentRunId } = await params;
  const supabase = createAdminClient();

  const { data: agent, error: agentError } = await supabase
    .from("agent_runs")
    .select()
    .eq("id", agentRunId)
    .eq("tournament_id", tournamentId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const [{ data: tournament }, { data: steps }] = await Promise.all([
    supabase
      .from("tournaments")
      .select("winner_agent_run_id")
      .eq("id", tournamentId)
      .single(),
    supabase
      .from("agent_steps")
      .select()
      .eq("agent_run_id", agentRunId)
      .order("step_number", { ascending: true }),
  ]);

  const [projectRes, sponsorRes] = await Promise.all([
    agent.selected_project_id
      ? supabase
          .from("projects")
          .select("id, name, description, github_urls")
          .eq("id", agent.selected_project_id)
          .single()
      : Promise.resolve({ data: null }),
    agent.selected_sponsor_id
      ? supabase
          .from("sponsors")
          .select("id, name, description")
          .eq("id", agent.selected_sponsor_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    agent,
    steps: steps ?? [],
    project: projectRes.data ?? null,
    sponsor: sponsorRes.data ?? null,
    isWinner: tournament?.winner_agent_run_id === agentRunId,
  });
}
