"use client";

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

interface AgentLogEntry {
  id: string;
  stepNumber: number;
  stepType: string;
  toolName: string | null;
  output: Record<string, unknown> | null;
}

function formatOutputValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => formatOutputValue(item))
      .filter(Boolean)
      .join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .slice(0, 3)
      .map(([key, val]) => `${key}: ${formatOutputValue(val)}`)
      .join(" | ");
  }
  return String(value);
}

function buildConsoleLine(entry: AgentLogEntry): string {
  const toolPrefix = entry.toolName ? `$ ${entry.toolName}` : "$ agent";

  if (entry.stepType === "llm_response") {
    const text = formatOutputValue(entry.output?.text).slice(0, 90);
    return `${toolPrefix} • ${text || "thinking..."}`;
  }

  if (entry.stepType === "error") {
    const err = formatOutputValue(entry.output?.error ?? entry.output).slice(0, 90);
    return `${toolPrefix} • error: ${err || "failed"}`;
  }

  const output = formatOutputValue(entry.output).slice(0, 90);
  return `${toolPrefix} • ${output || "ok"}`;
}

export function AgentCard({
  agent,
  isWinner,
  latestStep,
  flash,
  progressPercent,
  logs,
  onOpen,
}: {
  agent: AgentRun;
  isWinner: boolean;
  latestStep: LatestStep | null;
  flash: "completed" | "failed" | null;
  progressPercent: number;
  logs: AgentLogEntry[];
  onOpen: () => void;
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

  const borderClass =
    agent.status === "pending"
      ? "border-yellow-500/50 bg-yellow-950/10"
      : agent.status === "selecting" ||
          agent.status === "researching" ||
          agent.status === "planning"
        ? "border-blue-500/50 bg-blue-950/10"
        : agent.status === "completed"
          ? "border-green-500/50 bg-green-950/10"
          : "border-red-500/50 bg-red-950/10";

  const progressColorClass =
    agent.status === "pending"
      ? "[&::-webkit-progress-value]:bg-yellow-500/90 [&::-moz-progress-bar]:bg-yellow-500/90"
      : agent.status === "selecting" ||
          agent.status === "researching" ||
          agent.status === "planning"
        ? "[&::-webkit-progress-value]:bg-blue-500/90 [&::-moz-progress-bar]:bg-blue-500/90"
        : agent.status === "completed"
          ? "[&::-webkit-progress-value]:bg-green-500/90 [&::-moz-progress-bar]:bg-green-500/90"
          : "[&::-webkit-progress-value]:bg-red-500/90 [&::-moz-progress-bar]:bg-red-500/90";

  const activityColorClass =
    agent.status === "pending"
      ? "text-yellow-300"
      : agent.status === "selecting" ||
          agent.status === "researching" ||
          agent.status === "planning"
        ? "text-blue-300"
        : agent.status === "completed"
          ? "text-green-300"
          : "text-red-300";

  const activityLabel =
    isActive && latestStep?.toolName
      ? toolLabels[latestStep.toolName] ?? latestStep.toolName
      : null;

  const consoleLines = logs.slice(-3).map((entry) => ({
    id: entry.id,
    stepNumber: entry.stepNumber,
    text: buildConsoleLine(entry),
  }));

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`block h-full w-full border p-4 space-y-3 text-left transition-all duration-300 hover:border-foreground/70 cursor-pointer ${borderClass} ${flashClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">#{agent.agent_number}</span>
          <span className="text-sm text-foreground">{agent.personality}</span>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <p className="text-xs text-muted">{strategy}</p>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Progress</span>
          <span className="font-mono">{progressPercent}%</span>
        </div>
        <progress
          max={100}
          value={progressPercent}
          className={`h-2 w-full overflow-hidden rounded-sm [&::-webkit-progress-bar]:bg-border/50 [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500 [&::-moz-progress-bar]:transition-all [&::-moz-progress-bar]:duration-500 ${progressColorClass}`}
        />
      </div>

      {agent.selected_project_id && (
        <p className="text-xs text-accent-dim truncate">
          Project #{agent.selected_project_id}
        </p>
      )}

      {isWinner && (
        <div className="text-xs text-green-300 uppercase tracking-wider">
          Winner
        </div>
      )}

      {/* Live activity indicator */}
      {isActive && (
        <div className="flex items-center gap-1.5 min-h-5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full animate-pulse ${agent.status === "pending" ? "bg-yellow-400" : agent.status === "selecting" || agent.status === "researching" || agent.status === "planning" ? "bg-blue-400" : agent.status === "completed" ? "bg-green-400" : "bg-red-400"}`} />
          <span className={`text-xs truncate ${activityColorClass}`}>
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
        <div className="text-xs text-green-300">Plan submitted</div>
      )}
      {agent.status === "failed" && (
        <div className="text-xs text-red-400 truncate">
          {agent.error ?? "Failed"}
        </div>
      )}

      <div className="rounded-sm border border-border/70 bg-background/70 p-2 font-mono text-[11px] leading-4 min-h-20 space-y-1">
        {consoleLines.length === 0 ? (
          <div className="text-muted">$ waiting for agent output...</div>
        ) : (
          consoleLines.map((line) => (
            <div key={line.id} className="flex gap-2 text-muted">
              <span className={`shrink-0 ${activityColorClass}`}>{line.stepNumber.toString().padStart(2, "0")}</span>
              <span className="truncate">{line.text}</span>
            </div>
          ))
        )}
      </div>
    </button>
  );
}
