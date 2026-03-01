import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const limitParam = req.nextUrl.searchParams.get("limit");
  const parsedLimit = Number(limitParam);
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(50, Math.min(2000, Math.floor(parsedLimit)))
    : 600;

  const { data: agentRuns, error: runsError } = await supabase
    .from("agent_runs")
    .select("id")
    .eq("tournament_id", id);

  if (runsError) {
    return NextResponse.json({ error: runsError.message }, { status: 500 });
  }

  const agentRunIds = (agentRuns ?? []).map((run) => run.id);
  if (agentRunIds.length === 0) {
    return NextResponse.json({ steps: [] });
  }

  const { data: steps, error: stepsError } = await supabase
    .from("agent_steps")
    .select("id, agent_run_id, step_number, step_type, tool_name, output")
    .in("agent_run_id", agentRunIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  return NextResponse.json({ steps: (steps ?? []).reverse() });
}
