import { NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { tournamentWorkflow } from "@/lib/workflows/tournament";
import type { Tournament } from "@/lib/supabase/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { hackathon_id } = body;

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
      status: "pending" as const,
      agent_count: 10,
    })
    .select()
    .single<Tournament>();

  if (tErr || !tournament) {
    return NextResponse.json(
      { error: tErr?.message ?? "Failed to create tournament" },
      { status: 500 }
    );
  }

  // Start tournament workflow (fire-and-forget)
  const run = await start(tournamentWorkflow, [tournament.id, hackathon_id]);

  return NextResponse.json({
    tournament_id: tournament.id,
    workflow_run_id: run.runId,
  });
}
