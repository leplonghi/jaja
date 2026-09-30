"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

/** Contador ao vivo: consulta o número real de previsões a cada poucos segundos. */
export function LiveCount({ topicId, initial, className }: { topicId: string; initial: number; className?: string }) {
  const { tp } = useI18n();
  const [n, setN] = useState(initial);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/live/${topicId}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { count: number | null };
        if (!stop && typeof j.count === "number") setN(j.count);
      } catch {
        /* sem rede: mantém o último número */
      }
    };
    const id = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [topicId]);

  return (
    <span className={className} aria-live="polite">
      <span className="relative mr-1.5 inline-flex size-2 align-middle">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-70" />
        <span className="relative inline-flex size-2 rounded-full bg-signal" />
      </span>
      {tp("count.seals", n)}
    </span>
  );
}
