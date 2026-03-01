"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgentRun, AgentStep } from "@/lib/supabase/types";
import { AgentCard } from "./AgentCard";
import { AgentDetailsModal } from "./AgentDetailsModal";

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

interface AgentStepSnapshot {
  id: string;
  agent_run_id: string;
  step_number: number;
  step_type: string;
  tool_name: string | null;
  output: Record<string, unknown> | null;
}

const STATUS_PROGRESS: Record<AgentRun["status"], number> = {
  pending: 0,
  selecting: 20,
  researching: 50,
  planning: 80,
  completed: 100,
  failed: 100,
};

function getProgressPercent(agent: AgentRun, latestStep: LatestStep | null): number {
  if (agent.status === "completed" || agent.status === "failed") return 100;

  const base = STATUS_PROGRESS[agent.status] ?? 0;
  const stepBoost = Math.min((latestStep?.stepNumber ?? 0) * 3, 18);
  return Math.min(99, base + stepBoost);
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
  const [agentLogs, setAgentLogs] = useState<Record<string, AgentLogEntry[]>>({});
  const [flashingAgents, setFlashingAgents] = useState<Record<string, "completed" | "failed">>({});
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const prevStatusRef = useRef<Record<string, string>>({});
  const knownAgentIdsRef = useRef<Set<string>>(new Set(initialAgents.map((agent) => agent.id)));

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

  const applyStepSnapshot = useCallback((steps: AgentStepSnapshot[]) => {
    const latest: Record<string, LatestStep> = {};
    const grouped: Record<string, AgentLogEntry[]> = {};

    for (const step of steps) {
      const entry: AgentLogEntry = {
        id: step.id,
        stepNumber: step.step_number,
        stepType: step.step_type,
        toolName: step.tool_name,
        output: step.output,
      };

      const existing = grouped[step.agent_run_id] ?? [];
      grouped[step.agent_run_id] = [...existing, entry].slice(-12);

      const prev = latest[step.agent_run_id];
      if (!prev || step.step_number >= prev.stepNumber) {
        latest[step.agent_run_id] = {
          toolName: step.tool_name,
          stepType: step.step_type,
          stepNumber: step.step_number,
        };
      }
    }

    setAgentLogs(grouped);
    setLatestSteps(latest);
  }, []);

  useEffect(() => {
    knownAgentIdsRef.current = new Set(agents.map((agent) => agent.id));
  }, [agents]);

  useEffect(() => {
    let isStopped = false;

    const pollSnapshot = async () => {
      try {
        const [agentsRes, progressRes, stepsRes] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}/agents`, {
            cache: "no-store",
          }),
          fetch(`/api/tournaments/${tournamentId}/progress`, {
            cache: "no-store",
          }),
          fetch(`/api/tournaments/${tournamentId}/steps?limit=800`, {
            cache: "no-store",
          }),
        ]);

        if (isStopped) return;

        if (agentsRes.ok) {
          const agentsJson = (await agentsRes.json()) as { agents?: AgentRun[] };
          const nextAgents = (agentsJson.agents ?? []).sort(
            (a, b) => a.agent_number - b.agent_number
          );

          if (nextAgents.length > 0) {
            for (const next of nextAgents) {
              handleAgentUpdate(next);
              prevStatusRef.current[next.id] = next.status;
            }
            setAgents(nextAgents);
          }
        }

        const progressSteps = progressRes.ok
          ? (((await progressRes.json()) as { steps?: AgentStepSnapshot[] }).steps ?? [])
          : [];

        const dbSteps = stepsRes.ok
          ? (((await stepsRes.json()) as { steps?: AgentStepSnapshot[] }).steps ?? [])
          : [];

        const stepSource = progressSteps.length > 0 ? progressSteps : dbSteps;
        if (stepSource.length > 0) {
          applyStepSnapshot(stepSource);
        }
      } catch {
        // realtime subscriptions continue to work as primary path
      }
    };

    void pollSnapshot();
    const intervalId = window.setInterval(() => {
      void pollSnapshot();
    }, 2000);

    return () => {
      isStopped = true;
      window.clearInterval(intervalId);
    };
  }, [tournamentId, handleAgentUpdate, applyStepSnapshot]);

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
            knownAgentIdsRef.current.add(newAgent.id);
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

          const hasAgent = knownAgentIdsRef.current.has(step.agent_run_id);
          if (!hasAgent) return;

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

          setAgentLogs((prev) => {
            const nextForAgent = [
              ...(prev[step.agent_run_id] ?? []),
              {
                id: step.id,
                stepNumber: step.step_number,
                stepType: step.step_type,
                toolName: step.tool_name,
                output: step.output,
              },
            ].slice(-12);

            return {
              ...prev,
              [step.agent_run_id]: nextForAgent,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 auto-rows-fr">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isWinner={agent.id === winnerAgentRunId}
            latestStep={latestSteps[agent.id] ?? null}
            flash={flashingAgents[agent.id] ?? null}
            progressPercent={getProgressPercent(agent, latestSteps[agent.id] ?? null)}
            logs={agentLogs[agent.id] ?? []}
            onOpen={() => setSelectedAgentId(agent.id)}
          />
        ))}
      </div>

      {selectedAgentId && (
        <AgentDetailsModal
          tournamentId={tournamentId}
          agentRunId={selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
        />
      )}
    </div>
  );
}
