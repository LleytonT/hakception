import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
      <pre className="text-accent text-xs sm:text-sm mb-8 leading-tight">
{`
 _   _       _                    _   _
| | | | __ _| | _____ ___ _ __ | |_(_) ___  _ __
| |_| |/ _\` | |/ / __/ _ \\ '_ \\| __| |/ _ \\| '_ \\
|  _  | (_| |   < (_|  __/ |_) | |_| | (_) | | | |
|_| |_|\\__,_|_|\\_\\___\\___| .__/ \\__|_|\\___/|_| |_|
                          |_|
`}
      </pre>
      <p className="text-muted text-center max-w-lg mb-8">
        10 AI agents compete to integrate sponsor APIs into real hackathon projects.
        Watch them strategize, code, and test — live.
      </p>
      <Link
        href="/hackathons"
        className="border border-accent text-accent px-6 py-3 hover:bg-accent hover:text-background transition-colors font-mono"
      >
        {">"} Enter
      </Link>
    </div>
  );
}
