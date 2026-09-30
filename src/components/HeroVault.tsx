"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Fingerprint, Lock } from "lucide-react";
import { SealMark } from "./Logo";

/** Card de palpite "lacrado" flutuando: o visual central da landing. */
export function HeroVault() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="absolute -inset-10 rounded-full bg-wax/20 blur-3xl" />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 30, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="card relative overflow-hidden p-6"
      >
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-gold ring-1 ring-gold/25">
            <Lock size={12} /> Lacrado
          </span>
          <span>Revela em 3d 05h</span>
        </div>

        <h3 className="mt-5 text-xl font-semibold leading-snug">A eleição será decidida já no 1º turno?</h3>

        <div className="relative mt-5 space-y-2.5 rounded-xl bg-black/30 p-4 ring-1 ring-white/5">
          {[92, 100, 74, 88].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full bg-white/10 blur-[3px]" style={{ width: `${w}%` }} />
          ))}
          <div className="absolute inset-0 grid place-items-center">
            <motion.div
              animate={reduce ? undefined : { y: [0, -6, 0], rotate: [-4, 4, -4] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="drop-shadow-[0_10px_30px_rgba(255,79,109,0.55)]"
            >
              <SealMark size={76} />
            </motion.div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-iris/10 px-2 py-1 font-mono text-[11px] text-iris ring-1 ring-iris/25">
            <Fingerprint size={12} /> 7f3a9c…e21b
          </span>
          <span className="text-xs text-faint">1.284 lacres</span>
        </div>
      </motion.div>

      {/* Cartões secundários */}
      <motion.div
        initial={reduce ? false : { opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.7 }}
        className="card absolute -right-3 -top-6 hidden items-center gap-2 px-3 py-2 text-xs sm:flex"
      >
        <span className="grid size-6 place-items-center rounded-full bg-good/15 text-good">✓</span>
        <span>
          <b className="text-fg">Acertou!</b> <span className="text-muted">78% de confiança</span>
        </span>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.7 }}
        className="card absolute -bottom-5 -left-4 hidden items-center gap-2 px-3 py-2 text-xs sm:flex"
      >
        <span className="text-lg">🔥</span>
        <span>
          <b className="text-fg">5 acertos</b> <span className="text-muted">seguidos</span>
        </span>
      </motion.div>
    </div>
  );
}
