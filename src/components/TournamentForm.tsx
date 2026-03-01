"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TournamentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hackathon, setHackathon] = useState("");
  const [sponsor, setSponsor] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create hackathon
      const hRes = await fetch("/api/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: hackathon }),
      });
      if (!hRes.ok) throw new Error(await hRes.text());
      const { hackathon: h } = await hRes.json();

      // 2. Create sponsor
      const sRes = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathon_id: h.id,
          name: sponsor,
        }),
      });
      if (!sRes.ok) throw new Error(await sRes.text());

      // 3. Start tournament
      const tRes = await fetch("/api/tournaments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: h.id }),
      });
      if (!tRes.ok) throw new Error(await tRes.text());
      const { tournament_id } = await tRes.json();

      router.push(`/tournaments/${tournament_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent placeholder:text-muted";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="border border-red-600/50 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs text-muted uppercase tracking-wider">
          Your hackathon
        </label>
        <input
          type="text"
          required
          placeholder="e.g. HackMIT 2025"
          value={hackathon}
          onChange={(e) => setHackathon(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted uppercase tracking-wider">
          Sponsor prize you want to win
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Best Use of Stripe API"
          value={sponsor}
          onChange={(e) => setSponsor(e.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full border border-accent text-accent py-3 text-sm uppercase tracking-wider hover:bg-accent hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Launching..." : "> Launch Tournament"}
      </button>
    </form>
  );
}
