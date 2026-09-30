"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Loader2, Lock } from "lucide-react";
import { sealPrediction } from "@/app/eventos/actions";
import { cn } from "@/lib/format";
import type { EventOption } from "@/lib/types";
import { SealMark } from "./Logo";
import { ShareButton } from "./ShareButton";
import { HashPill } from "./ui";

function confidenceLabel(c: number) {
  if (c < 60) return "Na dúvida";
  if (c < 75) return "Inclinado";
  if (c < 90) return "Confiante";
  return "Certeza absoluta";
}

export function SealForm({
  eventId,
  eventTitle,
  options,
  loggedIn,
}: {
  eventId: string;
  eventTitle: string;
  options: EventOption[];
  loggedIn: boolean;
}) {
  const reduce = useReducedMotion();
  const [optionId, setOptionId] = useState<string | null>(null);
  const [thesis, setThesis] = useState("");
  const [confidence, setConfidence] = useState(70);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; commitment: string } | null>(null);
  const [pending, start] = useTransition();

  const thesisOk = thesis.trim().length >= 10 && thesis.length <= 1200;
  const ready = !!optionId && thesisOk;

  if (!loggedIn) {
    return (
      <div className="card p-6 text-center sm:p-10">
        <Lock className="mx-auto text-gold" size={28} aria-hidden />
        <h2 className="mt-3 text-xl font-semibold">Entre para lacrar seu palpite</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Leva 10 segundos, com Google, Apple ou e-mail.</p>
        <Link
          href={`/login?next=${encodeURIComponent(`/eventos/${eventId}`)}`}
          className="btn-primary mt-6 inline-flex rounded-xl px-6 py-3 text-sm"
        >
          Entrar e lacrar
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card relative overflow-hidden p-8 text-center sm:p-12"
        role="status"
      >
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-wax/15 to-transparent" />
        <motion.div
          initial={reduce ? false : { scale: 2.6, rotate: -25, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="mx-auto w-fit drop-shadow-[0_14px_40px_rgba(255,79,109,0.6)]"
        >
          <SealMark size={110} />
        </motion.div>
        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6 text-3xl font-extrabold tracking-tight"
        >
          Palpite lacrado.
        </motion.h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Ninguém vê o que você escreveu até o evento ser resolvido. Este hash é a sua prova pública:
        </p>
        <div className="mt-4 flex justify-center">
          <HashPill hash={done.commitment} />
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ShareButton
            path={`/p/${done.id}`}
            text={`Lacrei meu palpite sobre “${eventTitle}”. Só revelo depois que acontecer. 🔒`}
            label="Compartilhar minha prova"
            primary
          />
          <Link href="/cofre" className="btn-ghost rounded-xl px-5 py-3 text-sm font-semibold">
            Ver meu cofre
          </Link>
        </div>
      </motion.div>
    );
  }

  function submit() {
    if (!optionId) return;
    setError(null);
    start(async () => {
      const res = await sealPrediction({ eventId, optionId, thesis, confidence });
      if (res.ok) setDone({ id: res.id, commitment: res.commitment });
      else {
        setError(res.error);
        setConfirming(false);
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) setConfirming(true);
      }}
      className="card space-y-7 p-5 sm:p-8"
    >
      <fieldset>
        <legend className="text-sm font-semibold">1. O que vai acontecer?</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2" role="radiogroup">
          {options.map((o) => {
            const on = optionId === o.id;
            return (
              <button
                type="button"
                key={o.id}
                role="radio"
                aria-checked={on}
                onClick={() => setOptionId(o.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition",
                  on ? "border-gold/70 bg-gold/10 text-white ring-1 ring-gold/40" : "border-line bg-white/[0.03] text-muted hover:border-white/25 hover:text-fg",
                )}
              >
                {o.label}
                <span className={cn("grid size-5 place-items-center rounded-full border", on ? "border-gold bg-gold text-black" : "border-white/25")}>
                  {on && <Check size={13} strokeWidth={3} aria-hidden />}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="thesis" className="text-sm font-semibold">
          2. Por que você acha isso?
        </label>
        <p className="mt-1 text-xs text-muted">Explique o cenário como se fosse ler em voz alta depois. É isso que será revelado.</p>
        <textarea
          id="thesis"
          value={thesis}
          onChange={(e) => setThesis(e.target.value)}
          maxLength={1200}
          rows={5}
          placeholder="Ex.: Os três últimos confrontos mostram que…"
          className="mt-3 w-full resize-y rounded-xl border border-line bg-black/30 px-4 py-3 text-sm leading-relaxed placeholder:text-faint focus:border-gold/60 focus:outline-none"
        />
        <div className={cn("mt-1 text-right text-xs tabular-nums", thesis.length > 0 && !thesisOk ? "text-bad" : "text-faint")}>
          {thesis.trim().length < 10 && thesis.length > 0 ? `mínimo 10 caracteres · ` : ""}
          {thesis.length}/1200
        </div>
      </div>

      <div>
        <label htmlFor="conf" className="flex items-end justify-between text-sm font-semibold">
          <span>3. Quão confiante você está?</span>
          <span className="text-right">
            <span className="grad-text text-2xl font-extrabold tabular-nums">{confidence}%</span>
            <span className="block text-xs font-medium text-muted">{confidenceLabel(confidence)}</span>
          </span>
        </label>
        <input
          id="conf"
          type="range"
          min={50}
          max={99}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="mt-4 w-full accent-[#ff4f6d]"
        />
        <p className="mt-2 text-xs text-faint">Vale no ranking: confiança alta e certa rende muito; confiança alta e errada custa caro.</p>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad/10 px-3 py-2.5 text-sm text-bad">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-wax/40 bg-wax/10 p-4"
          >
            <p className="text-sm font-semibold">Depois de lacrar, não dá para editar nem apagar.</p>
            <div className="mt-3 flex gap-2.5">
              <button type="button" disabled={pending} onClick={submit} className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm">
                {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Lock size={16} aria-hidden />}
                {pending ? "Lacrando…" : "Confirmar e lacrar"}
              </button>
              <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn-ghost rounded-xl px-4 py-3 text-sm font-semibold">
                Voltar
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="go"
            type="submit"
            disabled={!ready}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-base"
          >
            <Lock size={18} aria-hidden /> Lacrar palpite
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  );
}
