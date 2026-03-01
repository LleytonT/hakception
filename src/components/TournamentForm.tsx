"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TournamentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hackathonName, setHackathonName] = useState("");
  const [hackathonDesc, setHackathonDesc] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorDesc, setSponsorDesc] = useState("");
  const [docUrls, setDocUrls] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create hackathon
      const hRes = await fetch("/api/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hackathonName,
          description: hackathonDesc || null,
        }),
      });
      if (!hRes.ok) throw new Error(await hRes.text());
      const { hackathon } = await hRes.json();

      // 2. Create sponsor
      const sRes = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hackathon_id: hackathon.id,
          name: sponsorName,
          description: sponsorDesc || null,
          doc_urls: docUrls
            .split("\n")
            .map((u: string) => u.trim())
            .filter(Boolean),
        }),
      });
      if (!sRes.ok) throw new Error(await sRes.text());

      // 3. Start tournament
      const tRes = await fetch("/api/tournaments/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hackathon_id: hackathon.id }),
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="border border-red-600/50 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm text-accent uppercase tracking-wider mb-2">
          Hackathon
        </legend>
        <input
          type="text"
          required
          placeholder="Hackathon name"
          value={hackathonName}
          onChange={(e) => setHackathonName(e.target.value)}
          className={inputClass}
        />
        <textarea
          placeholder="Description (optional)"
          value={hackathonDesc}
          onChange={(e) => setHackathonDesc(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm text-accent uppercase tracking-wider mb-2">
          Sponsor
        </legend>
        <input
          type="text"
          required
          placeholder="Sponsor / API name"
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          className={inputClass}
        />
        <textarea
          placeholder="Description — what does this API do? List key endpoints."
          value={sponsorDesc}
          onChange={(e) => setSponsorDesc(e.target.value)}
          rows={3}
          className={inputClass}
        />
        <textarea
          placeholder="Documentation URLs (one per line)"
          value={docUrls}
          onChange={(e) => setDocUrls(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        className="w-full border border-accent text-accent py-3 text-sm uppercase tracking-wider hover:bg-accent hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Launching..." : "> Launch Tournament (10 Agents)"}
      </button>
    </form>
  );
}
