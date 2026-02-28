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

-- Candidate projects considered in a tournament
create table if not exists tournament_projects (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  project_id bigint not null references public.projects(id),
  source text not null default 'embedding'
    check (source in ('embedding', 'manual', 'seed')),
  similarity_score double precision,
  created_at timestamptz not null default now(),
  unique (tournament_id, project_id)
);
create index if not exists tournament_projects_tournament_id_idx on tournament_projects(tournament_id);
create index if not exists tournament_projects_project_id_idx on tournament_projects(project_id);

-- Agent Runs
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  agent_number int not null,
  personality text not null,
  status text not null default 'pending'
    check (status in ('pending', 'selecting', 'researching', 'planning', 'coding', 'testing', 'completed', 'failed')),
  selected_project_id bigint references public.projects(id),
  selected_sponsor_id uuid references sponsors(id),
  extension_plan text,
  code_changes jsonb,
  sandbox_id text,
  sandbox_result jsonb,
  score jsonb,
  error text,
  unique (tournament_id, agent_number)
);
create index if not exists agent_runs_tournament_id_idx on agent_runs(tournament_id);
create index if not exists agent_runs_selected_project_id_idx on agent_runs(selected_project_id);
create index if not exists agent_runs_selected_sponsor_id_idx on agent_runs(selected_sponsor_id);

-- Add FK from tournaments.winner_agent_run_id -> agent_runs after agent_runs exists
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournaments_winner_fk'
  ) then
    alter table tournaments
      add constraint tournaments_winner_fk
      foreign key (winner_agent_run_id) references agent_runs(id);
  end if;
end $$;

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
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'tournaments'
    ) then
      alter publication supabase_realtime add table tournaments;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'tournament_projects'
    ) then
      alter publication supabase_realtime add table tournament_projects;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'agent_runs'
    ) then
      alter publication supabase_realtime add table agent_runs;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'agent_steps'
    ) then
      alter publication supabase_realtime add table agent_steps;
    end if;
  end if;
end $$;
