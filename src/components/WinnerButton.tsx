"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WinnerButton({
  tournamentId,
  agentRunId,
  isCurrentWinner,
}: {
  tournamentId: string;
  agentRunId: string;
  isCurrentWinner: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (isCurrentWinner) return;
    if (!confirm("Pick this agent as the tournament winner?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/winner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_run_id: agentRunId }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set winner");
    } finally {
      setLoading(false);
    }
  }

  if (isCurrentWinner) {
    return (
      <div className="border border-accent bg-accent/10 px-4 py-2 text-sm text-accent text-center uppercase tracking-wider">
        Current Winner
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full border border-accent text-accent px-4 py-2 text-sm uppercase tracking-wider hover:bg-accent hover:text-background transition-colors disabled:opacity-50"
    >
      {loading ? "Setting..." : "> Pick as Winner"}
    </button>
  );
}
