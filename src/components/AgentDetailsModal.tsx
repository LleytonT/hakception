"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import { PlanView } from "./PlanView";
import { StepTimeline } from "./StepTimeline";
import type { AgentRun, AgentStep } from "@/lib/supabase/types";

interface ModalData {
  agent: AgentRun;
  steps: AgentStep[];
  project: {
    id: number;
    name: string;
    description: string | null;
    github_urls: string[];
  } | null;
  sponsor: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  isWinner: boolean;
}

export function AgentDetailsModal({
  tournamentId,
  agentRunId,
  onClose,
}: {
  tournamentId: string;
  agentRunId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ModalData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const res = await fetch(
      `/api/tournaments/${tournamentId}/agents/${agentRunId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const json = (await res.json()) as ModalData;
    setData(json);
    setLoading(false);
  }, [tournamentId, agentRunId]);

  useEffect(() => {
    let stopped = false;

    const load = async () => {
      try {
        await loadData();
      } catch {
        if (!stopped) setLoading(false);
      }
    };

    void load();
    const id = window.setInterval(() => {
      void load();
    }, 2000);

    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [loadData]);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 sm:p-8" onClick={onClose}>
      <div
        className="mx-auto h-full w-full max-w-5xl overflow-y-auto border border-border bg-background p-4 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg text-foreground">Agent Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="border border-border px-3 py-1 text-sm text-muted hover:text-foreground"
          >
            Close
          </button>
        </div>

        {loading && (
          <div className="border border-border bg-surface p-4 text-sm text-muted">
            Loading agent details...
          </div>
        )}

        {!loading && !data && (
          <div className="border border-border bg-surface p-4 text-sm text-muted">
            Could not load agent details.
          </div>
        )}

        {data && (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">#{data.agent.agent_number}</span>
                <h3 className="text-lg text-foreground">{data.agent.personality}</h3>
                <StatusBadge status={data.agent.status} />
              </div>

              {data.isWinner && (
                <div className="text-xs uppercase tracking-wider text-green-300">
                  Winner
                </div>
              )}

              {data.agent.error && (
                <div className="border border-red-600/50 bg-red-950/20 p-3 text-sm text-red-400">
                  {data.agent.error}
                </div>
              )}
            </div>

            {(data.project || data.sponsor) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.project && (
                  <div className="border border-border bg-surface p-3 space-y-1">
                    <h3 className="text-xs text-accent uppercase tracking-wider">
                      Selected Project
                    </h3>
                    <p className="text-sm text-foreground">{data.project.name}</p>
                    {data.project.description && (
                      <p className="text-xs text-muted line-clamp-2">
                        {data.project.description}
                      </p>
                    )}
                    {data.project.github_urls?.[0] && (
                      <a
                        href={data.project.github_urls[0]}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent-dim hover:underline"
                      >
                        GitHub
                      </a>
                    )}
                  </div>
                )}

                {data.sponsor && (
                  <div className="border border-border bg-surface p-3 space-y-1">
                    <h3 className="text-xs text-accent uppercase tracking-wider">
                      Selected Sponsor
                    </h3>
                    <p className="text-sm text-foreground">{data.sponsor.name}</p>
                    {data.sponsor.description && (
                      <p className="text-xs text-muted line-clamp-2">
                        {data.sponsor.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <section className="space-y-2">
              <h3 className="text-sm text-accent uppercase tracking-wider">
                Integration Plan
              </h3>
              <PlanView agent={data.agent} />
            </section>

            <section className="space-y-2">
              <h3 className="text-sm text-accent uppercase tracking-wider">
                Agent Steps ({data.steps.length})
              </h3>
              <StepTimeline steps={data.steps} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
