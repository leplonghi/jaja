"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";

/** Contagem regressiva. Só calcula no cliente para não quebrar a hidratação. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const target = new Date(to).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <span className={className} suppressHydrationWarning>
      {left === null ? "··" : formatCountdown(left)}
    </span>
  );
}
