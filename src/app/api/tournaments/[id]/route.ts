import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select()
    .eq("id", id)
    .single();

  if (tErr || !tournament) {
    return NextResponse.json(
      { error: tErr?.message ?? "Tournament not found" },
      { status: 404 }
    );
  }

  // Fetch hackathon
  const { data: hackathon } = await supabase
    .from("hackathons")
    .select()
    .eq("id", tournament.hackathon_id)
    .single();

  // Fetch sponsors for this hackathon
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select()
    .eq("hackathon_id", tournament.hackathon_id);

  return NextResponse.json({ tournament, hackathon, sponsors: sponsors ?? [] });
}
