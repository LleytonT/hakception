"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgentRun, AgentStep } from "@/lib/supabase/types";
import { AgentCard } from "./AgentCard";

interface LatestStep {
  toolName: string | null;
  stepType: string;
  stepNumber: number;
}

export function AgentCardGrid({
  tournamentId,
  initialAgents,
  winnerAgentRunId,
}: {
  tournamentId: string;
  initialAgents: AgentRun[];
  winnerAgentRunId: string | null;
}) {
  const [agents, setAgents] = useState<AgentRun[]>(initialAgents);
  const [latestSteps, setLatestSteps] = useState<Record<string, LatestStep>>({});
  const [flashingAgents, setFlashingAgents] = useState<Record<string, "completed" | "failed">>({});
  const prevStatusRef = useRef<Record<string, string>>({});

  // Initialize previous status tracking
  useEffect(() => {
    const statuses: Record<string, string> = {};
    for (const a of initialAgents) {
      statuses[a.id] = a.status;
    }
    prevStatusRef.current = statuses;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAgentUpdate = useCallback((updated: AgentRun) => {
    const prev = prevStatusRef.current[updated.id];
    const isNewTerminal =
      (updated.status === "completed" || updated.status === "failed") &&
      prev !== "completed" &&
      prev !== "failed";

    prevStatusRef.current[updated.id] = updated.status;

    if (isNewTerminal) {
      setFlashingAgents((f) => ({ ...f, [updated.id]: updated.status as "completed" | "failed" }));
      setTimeout(() => {
        setFlashingAgents((f) => {
          const next = { ...f };
          delete next[updated.id];
          return next;
        });
      }, 1500);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      // Subscribe to agent_runs changes
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_runs",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAgent = payload.new as AgentRun;
            prevStatusRef.current[newAgent.id] = newAgent.status;
            setAgents((prev) => {
              const exists = prev.some((a) => a.id === newAgent.id);
              if (exists) return prev;
              return [...prev, newAgent].sort(
                (a, b) => a.agent_number - b.agent_number
              );
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as AgentRun;
            handleAgentUpdate(updated);
            setAgents((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            );
          }
        }
      )
      // Subscribe to agent_steps for live activity
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_steps",
        },
        (payload) => {
          const step = payload.new as AgentStep;
          setLatestSteps((prev) => {
            const existing = prev[step.agent_run_id];
            if (existing && existing.stepNumber >= step.step_number) return prev;
            return {
              ...prev,
              [step.agent_run_id]: {
                toolName: step.tool_name,
                stepType: step.step_type,
                stepNumber: step.step_number,
              },
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, handleAgentUpdate]);

  const completed = agents.filter((a) => a.status === "completed").length;
  const failed = agents.filter((a) => a.status === "failed").length;
  const running = agents.length - completed - failed;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs text-muted">
        <span>Total: {agents.length}</span>
        {running > 0 && (
          <span className="text-accent-dim">Running: {running}</span>
        )}
        {completed > 0 && (
          <span className="text-accent">Completed: {completed}</span>
        )}
        {failed > 0 && (
          <span className="text-red-400">Failed: {failed}</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            tournamentId={tournamentId}
            isWinner={agent.id === winnerAgentRunId}
            latestStep={latestSteps[agent.id] ?? null}
            flash={flashingAgents[agent.id] ?? null}
          />
        ))}
      </div>
    </div>
  );
}
