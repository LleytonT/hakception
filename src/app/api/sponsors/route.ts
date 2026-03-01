import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { hackathon_id, name, description, doc_urls } = await req.json();

  if (!hackathon_id || !name) {
    return NextResponse.json(
      { error: "hackathon_id and name required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: sponsor, error } = await supabase
    .from("sponsors")
    .insert({
      hackathon_id,
      name,
      description: description ?? null,
      doc_urls: doc_urls ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sponsor });
}
