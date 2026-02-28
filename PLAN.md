# Hakception Implementation Plan

## Concept
Multi-agent tournament system that scrapes 40k+ hackathon projects, runs 10 AI agents competing to select+extend projects with sponsor tech, outputs winning submission. Platform is the submission. Provocation narrative is the focus.

## Core Architecture

```
[Pre-scraped Devpost DB] → [Hackathon Config Input] → [10 Agent Teams]
                                                           ↓
                                                    [Select Project]
                                                           ↓
                                                    [Search Sponsor Docs]
                                                           ↓
                                                    [Plan Extension]
                                                           ↓
                                                    [Write Code]
                                                           ↓
                                                    [Test: runs?]
                                                           ↓
                                          [Tournament Evaluation] → [Dashboard]
```

## Sponsor Handling
Platform supports arbitrary sponsor streams per hackathon. User inputs sponsor names + optional doc URLs.
Agents handle unknown sponsors via: pre-fetched docs (if provided) → live web search → LLM knowledge fallback.
For YOUR demo: pre-configure Mistral hackathon sponsors (Mistral, Nvidia, W&B, Supercell, HF, Giant, Tilde Research).

## Critical Path (in order)

### Phase 1: Prove One Agent Works (Hours 6-14)
1. Manually select ONE simple Python project from Devpost
2. Build single agent that:
   - Reads project README + code structure
   - Searches/fetches W&B docs
   - Plans "add wandb logging to main functions"
   - Writes the code changes
   - Tests: `python main.py` runs without crash
3. **Gate**: If this fails, pivot to "analysis-only" mode (agents recommend, humans code)

### Phase 2: Scale to Tournament (Hours 14-24)
1. Curate 20 simple, extendable Python projects (good READMEs, clear entry points)
2. Build orchestration layer for 10 parallel agents
3. Each agent: select project → plan extension → code → test
4. Collect results, rank by: runs? + code diff size + extension type

### Phase 3: Dashboard (Hours 24-36)
1. React frontend showing:
   - 10 agent "teams" with progress indicators
   - Real-time logs from each agent
   - Project cards showing base → extended diff
   - Winner announcement with provocation framing
2. Keep it minimal. Progress bars + code diffs + narrative text.

### Phase 4: Polish + Demo Prep (Hours 36-48)
1. Practice the narrative arc
2. Pre-run tournament for reliability (show pre-run, offer live re-run)
3. Prepare fallback: if live demo fails, show recorded run

## Agent Prompt Structure (per team)

```
You are Agent Team {N} in a hackathon project tournament.

HACKATHON: {description}
SPONSOR STREAMS: {list with links to docs}
PROJECT DATABASE: {curated list of 20 projects with READMEs}

Your task:
1. Select ONE project from the database that can be extended for sponsor prizes
2. Research the sponsor API docs using web search
3. Plan a MINIMAL extension (add one feature, not rewrite)
4. Write the code changes as git patch or file edits
5. The extension must: integrate sponsor tech + run without crashing

Output format:
- Selected project: {name, repo URL}
- Extension plan: {what you'll add, which sponsor it targets}
- Code changes: {diff or new files}
- Test command: {how to verify it runs}
```

## Verification Strategy

**Approach: Pre-curated projects + Agent-generated test harness**

### Curated Project DB (you prepare this):
```json
{
  "name": "cool-ml-project",
  "repo_url": "github.com/...",
  "language": "python",
  "install_cmd": "pip install -r requirements.txt",
  "run_cmd": "python main.py",
  "key_files": ["main.py", "model.py"],
  "verified_runs": true
}
```

### Agent outputs:
1. Code changes (diff or new file contents)
2. `test_extension.py` - minimal script that imports + calls extended code
3. Extra deps needed (e.g., `wandb`)

### Sandbox execution:
```bash
git clone {repo} && cd repo
{install_cmd}
pip install {extra_deps}
# apply agent's code changes
python test_extension.py
# exit 0 + no crash = SUCCESS
```

### Success criteria:
- At least 1/10 agents produces runnable extension
- Rank by: runs? → sponsor integration depth → code quality (LLM judge)

## Tech Stack
- **Scraping**: Python (BeautifulSoup/Playwright) - pre-done
- **Database**: SQLite or JSON file with project metadata
- **Agent API**: Raw Mistral API (la-plateforme.mistral.ai)
- **Orchestration**: Python asyncio, 10 parallel agent loops
- **Code execution**: Vercel Sandboxes for isolated code testing
- **Dashboard**: Terminal output for MVP → React + WebSocket if time permits
- **Doc access**: Pre-fetch sponsor docs into context + live web search as fallback

## Risk Mitigation
| Risk | Mitigation |
|------|------------|
| Agents produce broken code | Narrow scope: W&B logging only for first pass |
| Arbitrary codebases too complex | Curate 20 simple, well-structured projects |
| No agent succeeds | Fallback: show "analysis mode" - agents recommend, human codes |
| Live demo crashes | Pre-run tournament, show recording, offer live re-run |
| "You didn't build anything" | The orchestration system IS the build. Show it working. |

## Demo Narrative (3 min pitch)

1. **Hook (30s)**: "OpenAI scraped the internet to build GPT. We scraped Devpost to win this hackathon."
2. **System (60s)**: Show dashboard, 10 agents competing, real-time progress
3. **Winner (45s)**: Show winning extension, base vs extended code diff
4. **Provocation (30s)**: "If AI can scrape, select, and extend open-source projects... what does that mean for hackathons? For open source?"
5. **CTA (15s)**: "The platform works. Try it yourself."

## Verification (How to Know It Works)
1. **Phase 1 gate**: Single agent produces code that runs in Vercel Sandbox without crashing
2. **Phase 2 gate**: At least 3/10 agents produce running extensions (not 0)
3. **Final verification**: Full tournament runs, dashboard shows progress, winner is selected and code executes
4. **Demo dry-run**: Record a successful tournament run before live demo

## Remaining Questions
1. Mistral API rate limits - stagger 10 concurrent agents? Multiple keys?
2. Clone + dependency setup in Vercel Sandbox before testing extension code?

## Files to Create
```
hakception/
├── scraper/           # Devpost scraping (pre-done?)
├── database/          # Project index + metadata
├── agents/
│   ├── single_agent.py    # Phase 1: one agent proof
│   └── tournament.py      # Phase 2: orchestration
├── execution/         # Sandboxed code runner
├── dashboard/         # React frontend
└── demo/             # Narrative assets, recordings
```
