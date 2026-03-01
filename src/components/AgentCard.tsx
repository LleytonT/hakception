"use client";

import Link from "next/link";
import type { AgentRun } from "@/lib/supabase/types";
import { StatusBadge } from "./StatusBadge";

const strategyMap: Record<string, string> = {
  "The Pragmatist": "Simple & reliable",
  "The Maximalist": "Deep integration",
  "The Niche Hunter": "Unexpected pairings",
  "The Speed Runner": "Fastest to finish",
  "The Researcher": "Knowledge-first",
  "The Remixer": "Multi-API mashup",
  "The Minimalist": "Surgical precision",
  "The Debugger": "Fix then extend",
  "The Crowd Pleaser": "Visual impact",
  "The Wildcard": "Embrace chaos",
};

const toolLabels: Record<string, string> = {
  search_projects: "Searching projects...",
  get_project_details: "Reading project...",
  fetch_sponsor_docs: "Fetching docs...",
  submit_plan: "Submitting plan...",
};

interface LatestStep {
  toolName: string | null;
  stepType: string;
  stepNumber: number;
}

export function AgentCard({
  agent,
  tournamentId,
  isWinner,
  latestStep,
  flash,
}: {
  agent: AgentRun;
  tournamentId: string;
  isWinner: boolean;
  latestStep: LatestStep | null;
  flash: "completed" | "failed" | null;
}) {
  const strategy = strategyMap[agent.personality] ?? "";
  const isTerminal = agent.status === "completed" || agent.status === "failed";
  const isActive = !isTerminal && agent.status !== "pending";

  const flashClass =
    flash === "completed"
      ? "animate-flash-green"
      : flash === "failed"
        ? "animate-flash-red"
        : "";

  const borderClass = isWinner
    ? "border-accent bg-accent/5"
    : agent.status === "failed"
      ? "border-red-500/50 bg-red-950/10"
      : agent.status === "completed"
        ? "border-accent/50 bg-accent/5"
        : isActive
          ? "border-accent-dim/50 bg-surface"
          : "border-border bg-surface";

  const activityLabel =
    isActive && latestStep?.toolName
      ? toolLabels[latestStep.toolName] ?? latestStep.toolName
      : null;

  return (
    <Link
      href={`/tournaments/${tournamentId}/agents/${agent.id}`}
      className={`block border p-4 space-y-2 transition-all duration-300 hover:border-accent ${borderClass} ${flashClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">#{agent.agent_number}</span>
          <span className="text-sm text-foreground">{agent.personality}</span>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <p className="text-xs text-muted">{strategy}</p>

      {agent.selected_project_id && (
        <p className="text-xs text-accent-dim truncate">
          Project #{agent.selected_project_id}
        </p>
      )}

      {isWinner && (
        <div className="text-xs text-accent uppercase tracking-wider">
          Winner
        </div>
      )}

      {/* Live activity indicator */}
      {isActive && (
        <div className="flex items-center gap-1.5 min-h-[20px]">
          <span className="inline-block w-1.5 h-1.5 bg-accent-dim rounded-full animate-pulse" />
          <span className="text-xs text-accent-dim truncate">
            {activityLabel ?? "Starting..."}
          </span>
          {latestStep && (
            <span className="text-xs text-muted ml-auto shrink-0">
              step {latestStep.stepNumber}
            </span>
          )}
        </div>
      )}

      {/* Terminal state summary */}
      {agent.status === "completed" && !isWinner && (
        <div className="text-xs text-accent">Plan submitted</div>
      )}
      {agent.status === "failed" && (
        <div className="text-xs text-red-400 truncate">
          {agent.error ?? "Failed"}
        </div>
      )}
    </Link>
  );
}
