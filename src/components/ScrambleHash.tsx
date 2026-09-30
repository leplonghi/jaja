"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const HEX = "0123456789abcdef";

/** O código da previsão "se forma" caractere a caractere: o instante em que ela é guardada. */
export function ScrambleHash({ hash, className }: { hash: string; className?: string }) {
  const reduce = !!useReducedMotion();
  const [shown, setShown] = useState(reduce ? hash : "");

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const total = 28;
    const id = setInterval(() => {
      frame++;
      const settled = Math.floor((frame / total) * hash.length);
      setShown(
        hash
          .split("")
          .map((c, i) => (i < settled ? c : HEX[Math.floor(Math.random() * 16)]))
          .join(""),
      );
      if (frame >= total) {
        clearInterval(id);
        setShown(hash);
      }
    }, 38);
    return () => clearInterval(id);
  }, [hash, reduce]);

  return (
    <code className={className} aria-label={hash}>
      <span aria-hidden>{shown || hash.replace(/./g, "·")}</span>
    </code>
  );
}
