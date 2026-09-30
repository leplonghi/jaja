"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { compactCountdown, countdownParts } from "@/lib/format";

function useRemaining(to: string) {
  const target = new Date(to).getTime();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(target - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return left;
}

/** Contagem compacta em linha. Só calcula no cliente para não quebrar a hidratação. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const { t } = useI18n();
  const left = useRemaining(to);
  return (
    <span className={className} suppressHydrationWarning>
      {left === null ? "··" : compactCountdown(left, t)}
    </span>
  );
}

function Digit({ value, reduce }: { value: string; reduce: boolean }) {
  return (
    <span className="relative inline-block h-[0.9em] w-[0.56em] overflow-hidden align-baseline">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={reduce ? false : { y: "105%" }}
          animate={{ y: 0 }}
          exit={reduce ? undefined : { y: "-105%" }}
          transition={{ duration: 0.38, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute inset-0 grid place-items-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** A contagem regressiva gigante: o elemento central da identidade do jaja. */
export function BigCountdown({ to, className }: { to: string; className?: string }) {
  const { t } = useI18n();
  const reduce = !!useReducedMotion();
  const left = useRemaining(to);
  const p = countdownParts(left ?? 0);
  const groups = [
    { v: p.d, label: t("unit.d") },
    { v: p.h, label: t("unit.h") },
    { v: p.m, label: t("unit.m") },
    { v: p.s, label: t("unit.s") },
  ];
  return (
    <div className={className} role="timer" aria-label={compactCountdown(left ?? 0, t)} suppressHydrationWarning>
      <div className="display flex items-end gap-[0.12em] leading-none numeral">
        {groups.map((g, i) => {
          const s = String(g.v).padStart(2, "0");
          return (
            <div key={g.label} className="flex items-end gap-[0.12em]">
              <div className={left === null ? "opacity-30" : undefined}>
                <div className="flex">
                  {s.split("").map((c, k) => (
                    <Digit key={k} value={c} reduce={reduce} />
                  ))}
                </div>
                <div className="kicker mt-2 !text-[0.7rem] !tracking-[0.18em] opacity-70" style={{ fontFamily: "var(--font-mono)" }}>
                  {g.label}
                </div>
              </div>
              {i < groups.length - 1 && <span className="pb-[0.42em] text-[0.4em] opacity-50" aria-hidden>:</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
