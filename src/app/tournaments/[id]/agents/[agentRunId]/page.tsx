import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { PlanView } from "@/components/PlanView";
import { StepTimeline } from "@/components/StepTimeline";
import { WinnerButton } from "@/components/WinnerButton";

interface AgentDetailPageProps {
  params: Promise<{ id: string; agentRunId: string }>;
}

export default async function AgentDetailPage({
  params,
}: AgentDetailPageProps) {
  const { id: tournamentId, agentRunId } = await params;
  const supabase = createAdminClient();

  const { data: agent } = await supabase
    .from("agent_runs")
    .select()
    .eq("id", agentRunId)
    .single();

  if (!agent) notFound();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("winner_agent_run_id")
    .eq("id", tournamentId)
    .single();

  const { data: steps } = await supabase
    .from("agent_steps")
    .select()
    .eq("agent_run_id", agentRunId)
    .order("step_number", { ascending: true });

  let project = null;
  if (agent.selected_project_id) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, description, github_urls")
      .eq("id", agent.selected_project_id)
      .single();
    project = data;
  }

  let sponsor = null;
  if (agent.selected_sponsor_id) {
    const { data } = await supabase
      .from("sponsors")
      .select("id, name, description")
      .eq("id", agent.selected_sponsor_id)
      .single();
    sponsor = data;
  }

  const isWinner = tournament?.winner_agent_run_id === agentRunId;

  return (
    <main className="min-h-screen bg-background text-foreground p-6 sm:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/tournaments/${tournamentId}`}
            className="text-sm text-muted hover:text-accent"
          >
            &larr; Back to tournament
          </Link>
        </div>

        {/* Agent Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-muted text-sm">#{agent.agent_number}</span>
            <h1 className="text-xl text-accent">{agent.personality}</h1>
            <StatusBadge status={agent.status} />
          </div>

          {agent.error && (
            <div className="border border-red-600/50 bg-red-950/20 p-3 text-sm text-red-400">
              {agent.error}
            </div>
          )}
        </div>

        {/* Project & Sponsor */}
        {(project || sponsor) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project && (
              <div className="border border-border bg-surface p-3 space-y-1">
                <h3 className="text-xs text-accent uppercase tracking-wider">
                  Selected Project
                </h3>
                <p className="text-sm text-foreground">{project.name}</p>
                {project.description && (
                  <p className="text-xs text-muted line-clamp-2">
                    {project.description}
                  </p>
                )}
                {project.github_urls?.[0] && (
                  <a
                    href={project.github_urls[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent-dim hover:underline"
                  >
                    GitHub
                  </a>
                )}
              </div>
            )}
            {sponsor && (
              <div className="border border-border bg-surface p-3 space-y-1">
                <h3 className="text-xs text-accent uppercase tracking-wider">
                  Selected Sponsor
                </h3>
                <p className="text-sm text-foreground">{sponsor.name}</p>
                {sponsor.description && (
                  <p className="text-xs text-muted line-clamp-2">
                    {sponsor.description}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Winner Button */}
        {agent.status === "completed" && (
          <WinnerButton
            tournamentId={tournamentId}
            agentRunId={agentRunId}
            isCurrentWinner={isWinner}
          />
        )}

        {/* Plan */}
        <section className="space-y-2">
          <h2 className="text-sm text-accent uppercase tracking-wider">
            Integration Plan
          </h2>
          <PlanView agent={agent} />
        </section>

        {/* Steps */}
        <section className="space-y-2">
          <h2 className="text-sm text-accent uppercase tracking-wider">
            Agent Steps ({steps?.length ?? 0})
          </h2>
          <StepTimeline steps={steps ?? []} />
        </section>
      </div>
    </main>
  );
}
