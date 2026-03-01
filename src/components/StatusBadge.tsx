"use client";

import type { AgentRunStatus, TournamentStatus } from "@/lib/supabase/types";

const agentColors: Record<AgentRunStatus, string> = {
  pending: "border-yellow-500/60 text-yellow-300",
  selecting: "border-blue-500/60 text-blue-300",
  researching: "border-blue-500/60 text-blue-300",
  planning: "border-blue-500/60 text-blue-300",
  completed: "border-green-500/60 text-green-300",
  failed: "border-red-500 text-red-400",
};

const tournamentColors: Record<TournamentStatus, string> = {
  pending: "border-muted text-muted",
  running: "border-accent-dim text-accent-dim",
  evaluating: "border-accent-dim text-accent-dim",
  completed: "border-accent text-accent",
  failed: "border-red-500 text-red-400",
};

export function StatusBadge({
  status,
  type = "agent",
}: {
  status: AgentRunStatus | TournamentStatus;
  type?: "agent" | "tournament";
}) {
  const colors =
    type === "tournament"
      ? tournamentColors[status as TournamentStatus]
      : agentColors[status as AgentRunStatus];

  return (
    <span className={`border px-2 py-0.5 text-xs uppercase tracking-wider ${colors}`}>
      {status}
    </span>
  );
}
