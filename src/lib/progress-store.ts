export interface ProgressEntry {
  id: string;
  agentRunId: string;
  stepNumber: number;
  stepType: "tool_call" | "llm_response" | "error";
  toolName: string | null;
  output: Record<string, unknown> | null;
  createdAt: string;
}

const progressStore = new Map<
  string,
  {
    entries: ProgressEntry[];
    latestByAgent: Map<string, number>;
  }
>();

function ensureTournamentBucket(tournamentId: string) {
  const existing = progressStore.get(tournamentId);
  if (existing) return existing;

  const bucket = {
    entries: [] as ProgressEntry[],
    latestByAgent: new Map<string, number>(),
  };
  progressStore.set(tournamentId, bucket);
  return bucket;
}

export function recordTournamentProgress(params: {
  tournamentId: string;
  entry: ProgressEntry;
}) {
  const bucket = ensureTournamentBucket(params.tournamentId);
  const prevStep = bucket.latestByAgent.get(params.entry.agentRunId) ?? 0;

  if (params.entry.stepNumber < prevStep) {
    return;
  }

  bucket.latestByAgent.set(params.entry.agentRunId, params.entry.stepNumber);
  bucket.entries.push(params.entry);

  if (bucket.entries.length > 5000) {
    bucket.entries = bucket.entries.slice(-2500);
  }
}

export function getTournamentProgress(tournamentId: string, limit = 800) {
  const bucket = progressStore.get(tournamentId);
  if (!bucket) return [] as ProgressEntry[];
  return bucket.entries.slice(-limit);
}
