# Hakception Implementation Plan

## Stack
- **Next.js** (App Router, TypeScript) deployed on **Vercel**
- **AI SDK v5** + **Vercel Workflows (WDK)** for durable agent orchestration (up to 24hr runtime)
- **Vercel AI Gateway** — Mistral primary, failover to Claude/GPT
- **Vercel Sandbox** (`@vercel/sandbox`) — Python 3.13 microVMs for code testing
- **Supabase** — scraped data + agent state + tournament results
- **Supabase Realtime** — live dashboard updates
- **Generic platform** — any hackathon, configurable sponsors

## Orchestration: Vercel Workflows
Tournament and agent runs use Vercel Workflows (WDK) with `"use workflow"` / `"use step"` directives. Solves serverless timeout problem — workflows run up to 24 hours with built-in retries, pause/resume, and observability. Each agent run = a workflow. Tournament = parent workflow spawning N child workflows.

## Project Structure
```
src/
  app/
    page.tsx                          # Landing
    hackathons/
      page.tsx                        # List
      new/page.tsx                    # Create hackathon + sponsors
      [hackathonId]/
        page.tsx                      # Detail + launch
        tournaments/[tournamentId]/
          page.tsx                    # Live dashboard (terminal-style, dark, monospace)
    api/
      hackathons/route.ts             # CRUD
      tournaments/
        route.ts                      # Create tournament
        [tournamentId]/
          route.ts                    # Status
          start/route.ts              # Triggers tournament workflow
          evaluate/route.ts           # Triggers evaluation
      agents/[agentRunId]/route.ts    # Agent detail
  lib/
    supabase/{client,server,admin,types}.ts
    ai/
      model.ts                        # Gateway config + failover chain
      agent.ts                        # Agent factory with AI SDK tools
      judge.ts                        # LLM judge for evaluation
      personalities.ts                # 10 distinct agent archetypes
    tools/
      search-projects.ts              # Query Supabase projects
      fetch-sponsor-docs.ts           # Fetch/cache sponsor docs
      web-search.ts                   # Web search fallback
      submit-plan.ts                  # Structured output: plan
      write-and-test.ts              # Sandbox clone->install->apply->test
    workflows/
      tournament.ts                   # "use workflow" — spawn N agent workflows, await all, evaluate
      agent-run.ts                    # "use workflow" — single agent lifecycle with steps
    orchestrator/
      evaluator.ts                    # Ranking: runs? > depth > quality
    sandbox/
      executor.ts                     # @vercel/sandbox wrapper
  components/
    tournament/{dashboard,agent-card,agent-timeline,code-diff,winner-banner}.tsx
    hackathon/{config-form,sponsor-input}.tsx
```

## Supabase Schema
```sql
-- Already exists (scraped data, ~40k rows) — SHAPE TBD, needs inspection
projects (id, devpost_url, name, tagline, description, repo_url, language,
          technologies[], readme_content, key_files JSONB, install_cmd,
          run_cmd, has_repo, verified_runs)

-- New tables
hackathons (id, name, description, created_at)

sponsors (id, hackathon_id FK, name, description, doc_urls[], cached_docs, created_at)

tournaments (id, hackathon_id FK, status [pending|running|evaluating|completed|failed],
             agent_count, config JSONB, started_at, completed_at, winner_agent_run_id)

agent_runs (id, tournament_id FK, agent_number, personality TEXT,
            status [pending|selecting|researching|planning|coding|testing|completed|failed],
            selected_project_id FK, selected_sponsor_id FK, extension_plan,
            code_changes JSONB, sandbox_id, sandbox_result JSONB, score JSONB, error)

agent_steps (id, agent_run_id FK, step_number, step_type [tool_call|llm_response|error],
             tool_name, input JSONB, output JSONB, duration_ms)

-- Realtime on: agent_runs, agent_steps, tournaments
```

## Agent Personalities (10 archetypes)
Each agent gets a distinct strategy via system prompt variation:
1. **The Pragmatist** — picks simplest project, minimal integration
2. **The Maximalist** — picks complex project, deep integration
3. **The Niche Hunter** — targets underrepresented sponsor categories
4. **The Speed Runner** — optimizes for fastest working submission
5. **The Researcher** — spends more time on docs, writes thorough code
6. **The Remixer** — combines multiple sponsor APIs
7. **The Minimalist** — smallest possible code change that counts
8. **The Debugger** — picks broken-looking projects and fixes+extends
9. **The Crowd Pleaser** — picks projects with good demos/visuals
10. **The Wildcard** — random strategy, high variance

## Agent Tools (5 total)
1. `search_projects` — query Supabase with language/keyword/tech filters
2. `get_project_details` — full README, key_files, install/run cmds
3. `fetch_sponsor_docs` — cached docs > fetch URLs > LLM knowledge fallback
4. `web_search` — external search for docs/examples
5. `write_and_test_code` — apply file changes to Sandbox, run test, return pass/fail + logs

## Agent Flow
```
Agent → search_projects (browse) → get_project_details → fetch_sponsor_docs
→ web_search (optional) → write_and_test_code → (retry if fail, 2x) → done
```
Max 30 tool calls per agent. Each step persisted to agent_steps for realtime dashboard.

## Implementation Phases

### Phase 0: Scaffold + Data Inspection
- create-next-app, install deps (ai, @vercel/sandbox, @supabase/supabase-js, zod, WDK)
- env vars, Supabase connection
- **Inspect existing projects table** — determine actual columns, decide if enrichment needed
- Create new tables migration (hackathons, sponsors, tournaments, agent_runs, agent_steps)
- Enable Realtime on key tables

### Phase 1: Single Agent Proof
- model.ts — Gateway config with Mistral + failover
- All 5 tools (test against one known project)
- agent.ts — agent factory with AI SDK tool loop
- sandbox executor: clone → install → apply → test
- Workflow wrapper: single agent-run.ts workflow
- **Gate**: one agent selects project, writes code, Sandbox exits 0

### Phase 2: Tournament Orchestration
- tournament.ts workflow — spawns N agent workflows, awaits all
- Agent personalities system (10 archetypes)
- agent_steps logging per tool call
- evaluator.ts — LLM judge ranks: runs? (50%) > integration depth (30%) > code quality (20%)
- API route: POST /tournaments/[id]/start triggers workflow

### Phase 3: Dashboard
- Terminal-style dark theme, monospace, hacker aesthetic
- Hackathon config form (name, sponsors with doc URLs)
- Live tournament view: 10 agent cards with streaming status
- Supabase Realtime subscriptions on agent_runs + agent_steps
- Code diff viewer (base vs modified)
- Winner reveal

### Phase 4: Polish
- Stagger agent workflow starts (5-10s apart)
- Error states in UI
- Tournament re-run
- Pre-run for demo reliability

## Risks
| Risk | Mitigation |
|------|------------|
| Sandbox git clone fails | Pre-filter has_repo=true, shallow clone, agent retries with different project |
| Agents produce broken code | Narrow prompt scope, pre-curate simple projects, 1/10 success is fine |
| 10 concurrent Sandboxes hit limits | Stagger starts, 5000 creations/month on Hobby |
| Gateway rate limits | Stagger, failover handles individual failures |
| Scraped data missing repo/readme | Enrichment step or filter to usable subset |

## Verification
1. **Phase 1**: single agent end-to-end — selects project, writes code, Sandbox exits 0
2. **Phase 2**: 3+ agents run concurrently via Workflows, results in Supabase
3. **Phase 3**: dashboard shows real-time progress via Realtime subscriptions
4. **Full**: tournament completes, agents ranked, winner displayed with code diff

## Open: Data Shape
Need to inspect existing Supabase `projects` table before Phase 0 completes. If missing repo_url/readme, we add an enrichment step or filter to the subset that has GitHub links.
