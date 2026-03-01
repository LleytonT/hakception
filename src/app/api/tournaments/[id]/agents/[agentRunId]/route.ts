import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; agentRunId: string }> }
) {
  const { agentRunId } = await params;
  const supabase = createAdminClient();

  const { data: agent, error: aErr } = await supabase
    .from("agent_runs")
    .select()
    .eq("id", agentRunId)
    .single();

  if (aErr || !agent) {
    return NextResponse.json(
      { error: aErr?.message ?? "Agent run not found" },
      { status: 404 }
    );
  }

  // Fetch steps
  const { data: steps } = await supabase
    .from("agent_steps")
    .select()
    .eq("agent_run_id", agentRunId)
    .order("step_number", { ascending: true });

  // Fetch selected project if any
  let project = null;
  if (agent.selected_project_id) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, description, github_urls, devpost_url")
      .eq("id", agent.selected_project_id)
      .single();
    project = data;
  }

  // Fetch selected sponsor if any
  let sponsor = null;
  if (agent.selected_sponsor_id) {
    const { data } = await supabase
      .from("sponsors")
      .select("id, name, description")
      .eq("id", agent.selected_sponsor_id)
      .single();
    sponsor = data;
  }

  return NextResponse.json({
    agent,
    steps: steps ?? [],
    project,
    sponsor,
  });
}
