import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log("=== Phase 1 Gate Test ===\n");
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Step 1: Ensure hackathon + sponsor exist
  console.log("1. Setting up test hackathon + sponsor...");

  let { data: hackathon } = await supabase
    .from("hackathons")
    .select()
    .eq("name", "Phase 1 Test")
    .single();

  if (!hackathon) {
    const { data, error } = await supabase
      .from("hackathons")
      .insert({
        name: "Phase 1 Test",
        description: "Phase 1 gate verification",
      })
      .select()
      .single();
    if (error) throw error;
    hackathon = data;
  }

  let { data: sponsor } = await supabase
    .from("sponsors")
    .select()
    .eq("hackathon_id", hackathon!.id)
    .limit(1)
    .single();

  if (!sponsor) {
    const { data, error } = await supabase
      .from("sponsors")
      .insert({
        hackathon_id: hackathon!.id,
        name: "JSONPlaceholder",
        description:
          "Free fake REST API for testing and prototyping. " +
          "Provides endpoints: GET /posts, GET /comments, GET /users, " +
          "POST /posts. Base URL: https://jsonplaceholder.typicode.com",
        doc_urls: ["https://jsonplaceholder.typicode.com/guide/"],
      })
      .select()
      .single();
    if (error) throw error;
    sponsor = data;
  }

  console.log(`   Hackathon: ${hackathon!.id}`);
  console.log(`   Sponsor: ${sponsor!.name} (${sponsor!.id})`);

  // Step 2: Verify projects with non-empty github_urls array exist
  const { count } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .not("github_urls", "eq", "{}");

  console.log(`\n2. Projects with GitHub URLs: ${count ?? 0}`);
  if (!count || count === 0) {
    console.log("   FAIL: No projects with github_urls found");
    process.exit(1);
  }

  // Step 3: Trigger agent run
  console.log("\n3. Triggering agent run via POST /api/test-agent...");
  console.log(`   Base URL: ${baseUrl}`);

  const res = await fetch(`${baseUrl}/api/test-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hackathon_id: hackathon!.id,
      agent_number: 1, // The Pragmatist
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.log(`   FAIL: API returned ${res.status}: ${err}`);
    process.exit(1);
  }

  const { agent_run_id, tournament_id, result } = await res.json();
  console.log(`   Agent run: ${agent_run_id}`);
  console.log(`   Tournament: ${tournament_id}`);

  // Step 4: Report result
  console.log("\n4. Agent result:");
  console.log(`   Success: ${result.success}`);
  console.log(`   Plan submitted: ${result.planSubmitted}`);
  console.log(`   Sandbox passed: ${result.sandboxPassed}`);
  console.log(`   Selected project: ${result.selectedProjectId}`);
  console.log(`   Selected sponsor: ${result.selectedSponsorId}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }

  // Step 5: Check agent_steps
  const { count: stepCount } = await supabase
    .from("agent_steps")
    .select("*", { count: "exact", head: true })
    .eq("agent_run_id", agent_run_id);

  console.log(`\n5. Steps logged: ${stepCount ?? 0}`);

  // Step 6: Check final agent_run state
  const { data: finalRun } = await supabase
    .from("agent_runs")
    .select(
      "status, selected_project_id, selected_sponsor_id, extension_plan, sandbox_result, code_changes, error"
    )
    .eq("id", agent_run_id)
    .single();

  if (finalRun) {
    console.log(`\n6. Final agent_run state:`);
    console.log(`   Status: ${finalRun.status}`);
    console.log(`   Project: ${finalRun.selected_project_id}`);
    console.log(`   Sponsor: ${finalRun.selected_sponsor_id}`);
    console.log(`   Plan: ${finalRun.extension_plan}`);
    console.log(
      `   Code changes: ${finalRun.code_changes ? Object.keys(finalRun.code_changes).join(", ") : "none"}`
    );
    console.log(`   Sandbox result: ${JSON.stringify(finalRun.sandbox_result)}`);
    if (finalRun.error) console.log(`   Error: ${finalRun.error}`);
  }

  // Gate check
  if (result.success) {
    console.log("\n=== GATE PASSED ===");
    process.exit(0);
  } else {
    console.log("\n=== GATE FAILED ===");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
