import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { TournamentHeader } from "@/components/TournamentHeader";
import { AgentCardGrid } from "@/components/AgentCardGrid";

interface TournamentPageProps {
  params: Promise<{ id: string }>;
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select()
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select()
    .eq("id", tournament.hackathon_id)
    .single();

  const { data: agents } = await supabase
    .from("agent_runs")
    .select()
    .eq("tournament_id", id)
    .order("agent_number", { ascending: true });

  return (
    <main className="min-h-screen bg-background text-foreground p-6 sm:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <TournamentHeader
          tournament={tournament}
          hackathon={hackathon}
        />

        <AgentCardGrid
          tournamentId={id}
          initialAgents={agents ?? []}
          winnerAgentRunId={tournament.winner_agent_run_id}
        />
      </div>
    </main>
  );
}
