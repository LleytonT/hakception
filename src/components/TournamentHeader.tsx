"use client";

import Link from "next/link";
import type { Tournament, Hackathon } from "@/lib/supabase/types";
import { StatusBadge } from "./StatusBadge";
import { ElapsedTimer } from "./ElapsedTimer";

export function TournamentHeader({
  tournament,
  hackathon,
}: {
  tournament: Tournament;
  hackathon: Hackathon | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl text-accent">
            {hackathon?.name ?? "Tournament"}
          </h1>
          <StatusBadge status={tournament.status} type="tournament" />
        </div>
        <Link href="/tournaments/new" className="text-sm text-muted hover:text-accent">
          + New
        </Link>
      </div>

      <div className="flex gap-4 text-xs text-muted">
        <span>
          Elapsed:{" "}
          <ElapsedTimer
            startedAt={tournament.started_at}
            completedAt={tournament.completed_at}
          />
        </span>
        <span>Agents: {tournament.agent_count}</span>
        <span className="font-mono text-muted/60">{tournament.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}
