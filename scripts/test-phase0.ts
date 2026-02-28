import { createClient } from "@supabase/supabase-js";
import { gateway } from "@ai-sdk/gateway";
import { generateText } from "ai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const gatewayKey = process.env.AI_GATEWAY_API_KEY!;

async function testSupabaseConnection() {
  console.log("\n--- Test 1: Supabase Connection ---");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.log("❌ Supabase connection failed:", error.message);
    return false;
  }
  console.log("✅ Supabase connected");
  return true;
}

async function inspectProjectsTable() {
  console.log("\n--- Test 2: Inspect Projects Table ---");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get row count
  const { count, error: countError } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.log("❌ Count query failed:", countError.message);
    return false;
  }
  console.log(`   Row count: ${count}`);

  // Get a sample row to see actual columns
  const { data: sample, error: sampleError } = await supabase
    .from("projects")
    .select("*")
    .limit(1);

  if (sampleError) {
    console.log("❌ Sample query failed:", sampleError.message);
    return false;
  }

  if (sample && sample.length > 0) {
    const columns = Object.keys(sample[0]);
    console.log(`   Columns (${columns.length}): ${columns.join(", ")}`);
    console.log("   Sample row:");
    for (const [key, value] of Object.entries(sample[0])) {
      const display =
        typeof value === "string" && value.length > 80
          ? value.slice(0, 80) + "..."
          : value;
      console.log(`     ${key}: ${display}`);
    }
  } else {
    console.log("   ⚠️  Projects table is empty");
  }

  // Check how many have repo_url
  const { count: repoCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .not("repo_url", "is", null);

  console.log(`   Projects with repo_url: ${repoCount}`);

  // Check how many have readme_content
  const { count: readmeCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .not("readme_content", "is", null);

  console.log(`   Projects with readme_content: ${readmeCount}`);

  console.log("✅ Projects table inspected");
  return true;
}

async function runMigration() {
  console.log("\n--- Test 3: Run Migration ---");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if tables already exist by trying to query them
  const tables = ["hackathons", "sponsors", "tournaments", "agent_runs", "agent_steps"];
  const existing: string[] = [];
  const missing: string[] = [];

  for (const table of tables) {
    const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      missing.push(table);
    } else {
      existing.push(table);
    }
  }

  if (existing.length > 0) {
    console.log(`   Already exist: ${existing.join(", ")}`);
  }
  if (missing.length > 0) {
    console.log(`   Missing: ${missing.join(", ")}`);
    console.log("   ⚠️  Run supabase/migration.sql in Supabase SQL Editor to create missing tables");
    return false;
  }

  console.log("✅ All tables exist");
  return true;
}

async function testAIGateway() {
  console.log("\n--- Test 4: AI Gateway ---");

  if (!gatewayKey) {
    console.log("❌ AI_GATEWAY_API_KEY not set");
    return false;
  }

  try {
    const { text } = await generateText({
      model: gateway("mistral/mistral-small-latest"),
      prompt: "Reply with exactly: GATEWAY_OK",
      maxOutputTokens: 20,
    });
    console.log(`   Response: ${text.trim()}`);
    console.log("✅ AI Gateway connected");
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("❌ AI Gateway failed:", message);
    return false;
  }
}

async function main() {
  console.log("=== Hakception Phase 0 Verification ===");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Gateway key: ${gatewayKey ? gatewayKey.slice(0, 8) + "..." : "NOT SET"}`);

  const results = {
    supabase: await testSupabaseConnection(),
    projects: await inspectProjectsTable(),
    migration: await runMigration(),
    gateway: await testAIGateway(),
  };

  console.log("\n=== Summary ===");
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? "✅" : "❌"} ${test}`);
  }

  const allPassed = Object.values(results).every(Boolean);
  console.log(`\n${allPassed ? "🎉 Phase 0 fully verified!" : "⚠️  Some tests failed — see above"}`);
  process.exit(allPassed ? 0 : 1);
}

main();
