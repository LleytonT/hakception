"use client";

import { useEffect, useState } from "react";

export function ElapsedTimer({
  startedAt,
  completedAt,
}: {
  startedAt: string | null;
  completedAt: string | null;
}) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startedAt) {
      setElapsed("--");
      return;
    }

    const start = new Date(startedAt).getTime();

    function update() {
      const end = completedAt
        ? new Date(completedAt).getTime()
        : Date.now();
      const seconds = Math.floor((end - start) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setElapsed(`${mins}:${secs.toString().padStart(2, "0")}`);
    }

    update();

    if (completedAt) return;

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt, completedAt]);

  return <span className="text-accent tabular-nums">{elapsed}</span>;
}
