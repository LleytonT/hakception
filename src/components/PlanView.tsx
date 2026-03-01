"use client";

import type { AgentRun } from "@/lib/supabase/types";

export function PlanView({ agent }: { agent: AgentRun }) {
  if (!agent.extension_plan) {
    return (
      <div className="border border-border bg-surface p-4 text-sm text-muted">
        No plan submitted yet.
      </div>
    );
  }

  // extension_plan is stored as a JSON string from submit_plan
  let plan: {
    plan_summary?: string;
    integration_approach?: string;
    api_endpoints_used?: string[];
    files_to_modify?: string[];
    project_name?: string;
    sponsor_name?: string;
  } = {};

  try {
    plan = JSON.parse(agent.extension_plan);
  } catch {
    // Plain text fallback
    return (
      <div className="border border-border bg-surface p-4 text-sm text-foreground whitespace-pre-wrap">
        {agent.extension_plan}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plan.plan_summary && (
        <section className="border border-border bg-surface p-4 space-y-2">
          <h3 className="text-xs text-accent uppercase tracking-wider">
            Plan Summary
          </h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {plan.plan_summary}
          </p>
        </section>
      )}

      {plan.integration_approach && (
        <section className="border border-border bg-surface p-4 space-y-2">
          <h3 className="text-xs text-accent uppercase tracking-wider">
            Integration Approach
          </h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {plan.integration_approach}
          </p>
        </section>
      )}

      {plan.api_endpoints_used && plan.api_endpoints_used.length > 0 && (
        <section className="border border-border bg-surface p-4 space-y-2">
          <h3 className="text-xs text-accent uppercase tracking-wider">
            API Endpoints
          </h3>
          <ul className="text-sm text-foreground space-y-1">
            {plan.api_endpoints_used.map((ep, i) => (
              <li key={i} className="font-mono text-xs text-accent-dim">
                {ep}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.files_to_modify && plan.files_to_modify.length > 0 && (
        <section className="border border-border bg-surface p-4 space-y-2">
          <h3 className="text-xs text-accent uppercase tracking-wider">
            Files to Modify
          </h3>
          <ul className="text-sm space-y-1">
            {plan.files_to_modify.map((f, i) => (
              <li key={i} className="font-mono text-xs text-muted">
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
