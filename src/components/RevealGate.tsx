"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ChevronsRight } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/client";
import { Logo } from "./Logo";

const HANDLE = 64;
const EVENT = "jaja-opened";

/** Lê do navegador se este envelope já foi aberto (sem setState em efeito). */
function useAlreadyOpened(key: string) {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      window.addEventListener(EVENT, cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener(EVENT, cb);
      };
    },
    () => {
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
}

function remember(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* sem armazenamento: o envelope aparece sempre */
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Envelope que se rasga: a revelação em dois tempos. Enquanto fechado, mostra só o
 * envelope; ao rasgar (arrastando, ou pelo botão), o conteúdo aparece.
 * Lembra no navegador que este envelope já foi aberto.
 */
export function RevealGate({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { t } = useI18n();
  const reduce = !!useReducedMotion();
  const key = `jaja-opened-${id}`;
  const alreadyOpened = useAlreadyOpened(key);
  const [state, setState] = useState<"closed" | "opening" | "open">("closed");
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [max, setMax] = useState(240);
  const progress = useTransform(x, [0, Math.max(max, 1)], [0, 1]);
  const topY = useTransform(progress, [0, 1], ["0%", "-6%"]);
  const botY = useTransform(progress, [0, 1], ["0%", "6%"]);
  const rotTop = useTransform(progress, [0, 1], [0, -1.5]);
  const rotBot = useTransform(progress, [0, 1], [0, 1.5]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setMax(Math.max(0, el.clientWidth - HANDLE - 8));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state]);

  function open() {
    if (state !== "closed") return;
    if (reduce) {
      remember(key);
      return setState("open");
    }
    setState("opening");
    animate(x, max, { duration: 0.2 });
    setTimeout(() => {
      remember(key);
      setState("open");
    }, 820);
  }

  if (state === "open" || (alreadyOpened && state === "closed")) {
    return (
      <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}>
        {children}
      </motion.div>
    );
  }

  const opening = state === "opening";
  return (
    <div className="relative mx-auto h-[19rem] w-full max-w-3xl select-none sm:h-[22rem]" role="group" aria-label={t("tear.aria")}>
      {/* metade de cima */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[58%] origin-bottom-left [filter:drop-shadow(0_2.5px_0_var(--color-ink))]"
        style={{ y: opening ? undefined : topY, rotate: opening ? undefined : rotTop }}
        animate={opening ? { y: "-130%", rotate: -7, opacity: 0 } : undefined}
        transition={{ duration: 0.75, ease: [0.5, 0, 0.75, 0] }}
      >
        <div className="tear-top flex h-full flex-col items-center justify-center gap-3 border-x-[1.5px] border-t-[1.5px] border-ink bg-signal px-6 pb-8 text-center">
          <Logo size={44} />
          <p className="display-mid max-w-xl text-balance text-xl sm:text-3xl">{title}</p>
        </div>
      </motion.div>
      {/* metade de baixo */}
      <motion.div
        className="absolute inset-x-0 bottom-0 h-[58%] origin-top-right [filter:drop-shadow(0_-2.5px_0_var(--color-ink))]"
        style={{ y: opening ? undefined : botY, rotate: opening ? undefined : rotBot }}
        animate={opening ? { y: "130%", rotate: 6, opacity: 0 } : undefined}
        transition={{ duration: 0.75, ease: [0.5, 0, 0.75, 0] }}
      >
        <div className="tear-bottom flex h-full flex-col items-center justify-end gap-3 border-x-[1.5px] border-b-[1.5px] border-ink bg-signal-deep px-4 pb-6 pt-10 sm:px-10">
          <div ref={track} className="relative h-16 w-full max-w-md rounded-full border-[1.5px] border-ink bg-paper/70">
            <span className="kicker pointer-events-none absolute inset-0 grid place-items-center pl-16">{t("tear.hint")}</span>
            <motion.button
              type="button"
              drag="x"
              dragConstraints={{ left: 0, right: max }}
              dragElastic={0}
              dragMomentum={false}
              style={{ x }}
              onDragEnd={() => (x.get() > max * 0.62 ? open() : animate(x, 0, { type: "spring", stiffness: 420, damping: 30 }))}
              className="absolute left-1 top-1 grid size-14 cursor-grab place-items-center rounded-full border-[1.5px] border-ink bg-ink text-paper active:cursor-grabbing"
              aria-label={t("tear.aria")}
              tabIndex={-1}
            >
              <ChevronsRight size={24} aria-hidden />
            </motion.button>
          </div>
          <button type="button" onClick={open} className="btn btn-ink px-6 py-3 text-sm">
            {t("tear.button")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
