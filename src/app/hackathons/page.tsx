import Link from "next/link";
import { runProjectSearch } from "@/lib/tools/search-projects";

interface HackathonsPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function HackathonsPage({
  searchParams,
}: HackathonsPageProps) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let results: Awaited<ReturnType<typeof runProjectSearch>>["projects"] = [];
  let errorMessage: string | null = null;

  if (query) {
    try {
      const response = await runProjectSearch(query, 25, 0.2);
      results = response.projects;
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Unexpected search error.";
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 sm:p-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl text-accent">Hackathons</h1>
          <Link href="/" className="text-sm text-muted hover:text-accent">
            ← Home
          </Link>
        </div>

        <p className="text-sm text-muted">
          Search your reference projects semantically to find the best candidates
          for a 10-agent tournament.
        </p>

        <form method="get" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Describe what you want to build (e.g. AI mentor for hackathon teams)"
            className="w-full border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="border border-accent px-4 py-2 text-sm text-accent hover:bg-accent hover:text-background"
          >
            Search
          </button>
        </form>

        {errorMessage ? (
          <div className="border border-red-600/50 bg-red-950/20 p-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {query && !errorMessage ? (
          <section className="space-y-3">
            <h2 className="text-sm text-muted">
              Results for &quot;{query}&quot; ({results.length})
            </h2>

            {results.length === 0 ? (
              <div className="border border-border bg-surface p-4 text-sm text-muted">
                No semantic matches found. Try a broader description.
              </div>
            ) : (
              <ul className="space-y-3">
                {results.map((project) => (
                  <li
                    key={project.id}
                    className="border border-border bg-surface p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-base text-accent">
                        {project.name ?? `Project #${project.id}`}
                      </h3>
                      <span className="text-xs text-muted">
                        Similarity {(project.similarity * 100).toFixed(1)}%
                      </span>
                    </div>

                    {project.description ? (
                      <p className="text-sm text-foreground/90">
                        {project.description}
                      </p>
                    ) : null}

                    {project.github_url ? (
                      <a
                        href={project.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-accent hover:underline"
                      >
                        GitHub Repo
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <div className="border border-border bg-surface p-4 text-sm text-muted">
            Enter a project idea to run semantic search.
          </div>
        )}
      </div>
    </main>
  );
}
