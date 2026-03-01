import Link from "next/link";
import { TournamentForm } from "@/components/TournamentForm";

export default function NewTournamentPage() {
  return (
    <main className="min-h-screen bg-background text-foreground p-6 sm:p-10">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-accent">New Tournament</h1>
          <Link href="/" className="text-sm text-muted hover:text-accent">
            &larr; Home
          </Link>
        </div>

        <p className="text-sm text-muted">
          Configure a hackathon and sponsor API, then launch 10 AI agents to
          compete on integration plans.
        </p>

        <TournamentForm />
      </div>
    </main>
  );
}
