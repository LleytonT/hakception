"use client";

import type { AgentStep } from "@/lib/supabase/types";

export function StepTimeline({ steps }: { steps: AgentStep[] }) {
  if (steps.length === 0) {
    return (
      <div className="border border-border bg-surface p-4 text-sm text-muted">
        No steps recorded.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {steps.map((step) => (
        <div
          key={step.id}
          className="flex items-center gap-3 border-l-2 border-border pl-3 py-1.5 text-xs"
        >
          <span className="text-muted w-6 text-right shrink-0">
            {step.step_number}
          </span>

          {step.step_type === "tool_call" ? (
            <>
              <span className="text-accent-dim font-mono">
                {step.tool_name ?? "tool"}
              </span>
              {step.duration_ms != null && (
                <span className="text-muted">
                  {step.duration_ms >= 1000
                    ? `${(step.duration_ms / 1000).toFixed(1)}s`
                    : `${step.duration_ms}ms`}
                </span>
              )}
            </>
          ) : step.step_type === "error" ? (
            <span className="text-red-400">
              Error{step.output ? `: ${JSON.stringify(step.output).slice(0, 80)}` : ""}
            </span>
          ) : (
            <span className="text-muted">LLM response</span>
          )}
        </div>
      ))}
    </div>
  );
}
