import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { agent_run_id } = await req.json();

  if (!agent_run_id) {
    return NextResponse.json(
      { error: "agent_run_id required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tournaments")
    .update({ winner_agent_run_id: agent_run_id })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
