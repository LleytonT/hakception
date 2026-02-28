-- Hakception schema migration
-- Run this against your Supabase project via SQL Editor

-- Hackathons
create table if not exists hackathons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Sponsors
create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  name text not null,
  description text,
  doc_urls text[] not null default '{}',
  cached_docs text,
  created_at timestamptz not null default now()
);
create index if not exists sponsors_hackathon_id_idx on sponsors(hackathon_id);

-- Tournaments
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'evaluating', 'completed', 'failed')),
  agent_count int not null default 10,
  config jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  winner_agent_run_id uuid
);
create index if not exists tournaments_hackathon_id_idx on tournaments(hackathon_id);

-- Agent Runs
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  agent_number int not null,
  personality text not null,
  status text not null default 'pending'
    check (status in ('pending', 'selecting', 'researching', 'planning', 'coding', 'testing', 'completed', 'failed')),
  selected_project_id uuid,
  selected_sponsor_id uuid references sponsors(id),
  extension_plan text,
  code_changes jsonb,
  sandbox_id text,
  sandbox_result jsonb,
  score jsonb,
  error text
);
create index if not exists agent_runs_tournament_id_idx on agent_runs(tournament_id);

-- Add FK from tournaments.winner_agent_run_id -> agent_runs after agent_runs exists
alter table tournaments
  add constraint tournaments_winner_fk
  foreign key (winner_agent_run_id) references agent_runs(id);

-- Agent Steps
create table if not exists agent_steps (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null references agent_runs(id) on delete cascade,
  step_number int not null,
  step_type text not null
    check (step_type in ('tool_call', 'llm_response', 'error')),
  tool_name text,
  input jsonb,
  output jsonb,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index if not exists agent_steps_agent_run_id_idx on agent_steps(agent_run_id);

-- Enable Realtime on tables that the dashboard subscribes to
alter publication supabase_realtime add table tournaments;
alter publication supabase_realtime add table agent_runs;
alter publication supabase_realtime add table agent_steps;
