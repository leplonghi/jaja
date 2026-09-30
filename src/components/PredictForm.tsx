"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, Lock } from "lucide-react";
import { sealPrediction } from "@/app/actions";
import type { Key } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/format";
import type { Topic } from "@/lib/types";
import { ScrambleHash } from "./ScrambleHash";
import { ShareButton } from "./ShareButton";

/** Formulário de previsão para evento (opção + texto opcional) ou desafio (texto). */
export function PredictForm({ topic, loggedIn, onboarded }: { topic: Topic; loggedIn: boolean; onboarded: boolean }) {
  const { t } = useI18n();
  const reduce = !!useReducedMotion();
  const isEvent = topic.kind === "event";
  const max = isEvent ? 1200 : 2000;
  const minLen = isEvent ? 0 : 10;

  const [optionId, setOptionId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [withConf, setWithConf] = useState(false);
  const [confidence, setConfidence] = useState(70);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [done, setDone] = useState<{ id: string; commitment: string } | null>(null);
  const [pending, start] = useTransition();

  const bodyOk = body.trim().length >= minLen && body.length <= max;
  const ready = (isEvent ? !!optionId : true) && bodyOk;
  const here = `/t/${topic.id}`;

  if (!loggedIn || !onboarded) {
    const href = !loggedIn ? `/login?next=${encodeURIComponent(here)}` : `/welcome?next=${encodeURIComponent(here)}`;
    return (
      <div className="sheet p-6 text-center sm:p-10">
        <Lock className="mx-auto" size={28} aria-hidden />
        <h2 className="display-mid mt-3 text-2xl">{t("form.login.t")}</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{t("form.login.b")}</p>
        <Link href={href} className="btn btn-signal mt-6 px-7 py-3.5 text-sm">
          {t("form.login.cta")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <motion.div initial={reduce ? false : { opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="sheet ink-block p-8 text-center sm:p-12" role="status">
        <motion.div
          initial={reduce ? false : { scale: 2.4, rotate: -14, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 15 }}
          className="mx-auto grid size-24 place-items-center rounded-full border-[1.5px] border-paper bg-signal text-ink"
        >
          <Check size={48} strokeWidth={3} aria-hidden />
        </motion.div>
        <h2 className="display mt-6 text-6xl sm:text-7xl">{t("done.title")}</h2>
        <p className="mx-auto mt-3 max-w-md text-paper/80">{t("done.body")}</p>
        <ScrambleHash hash={done.commitment} className="mx-auto mt-5 block max-w-full break-all font-mono text-sm text-signal" />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ShareButton
            path={`/p/${done.id}`}
            text={t("topic.shareProofText", { title: topic.title })}
            label={t("done.share")}
            copiedLabel={t("share.copied")}
            primary
          />
          <Link href="/vault" className="btn px-5 py-3.5 text-sm border-[1.5px] border-paper text-paper hover:bg-paper hover:text-ink">
            {t("done.vault")}
          </Link>
        </div>
      </motion.div>
    );
  }

  function submit() {
    setError(null);
    start(async () => {
      const r = await sealPrediction({ topicId: topic.id, optionId, body, confidence: isEvent && withConf ? confidence : null });
      if (r.ok) setDone({ id: r.id, commitment: r.commitment });
      else {
        setError(r.error);
        setConfirming(false);
      }
    });
  }

  const confLabel = confidence < 60 ? "form.conf.1" : confidence < 75 ? "form.conf.2" : confidence < 90 ? "form.conf.3" : "form.conf.4";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) setConfirming(true);
      }}
      className="sheet space-y-7 p-5 sm:p-8"
    >
      {isEvent && (
        <fieldset>
          <legend className="display-mid text-xl">{t("form.pick")}</legend>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2" role="radiogroup">
            {topic.options.map((o) => {
              const on = optionId === o.id;
              return (
                <button
                  type="button"
                  key={o.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setOptionId(o.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-ink px-5 py-4 text-left text-base font-semibold transition",
                    on ? "bg-signal shadow-[4px_4px_0_var(--color-ink)]" : "bg-card hover:bg-paper-2",
                  )}
                >
                  {o.label}
                  <span className={cn("grid size-6 place-items-center rounded-full border-[1.5px] border-ink", on && "bg-ink text-paper")}>
                    {on && <Check size={14} strokeWidth={3} aria-hidden />}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div>
        <label htmlFor="body" className="display-mid text-xl">
          {isEvent ? t("form.body.event") : t("form.body.free")}
        </label>
        <p className="mt-1 text-sm text-muted">{t("form.body.hint")}</p>
        <textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={max}
          rows={isEvent ? 4 : 6}
          placeholder={t("form.body.ph")}
          className="field mt-3 resize-y leading-relaxed"
        />
        <div className={cn("mt-1 text-right text-xs numeral", body.length > 0 && !bodyOk ? "font-semibold text-bad" : "text-muted")}>
          {body.trim().length < minLen && body.length > 0 ? `${t("form.min", { n: minLen })} · ` : ""}
          {body.length}/{max}
        </div>
      </div>

      {isEvent && (
        <div>
          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
            <input type="checkbox" checked={withConf} onChange={(e) => setWithConf(e.target.checked)} className="size-5 accent-[#ff4a1c]" />
            {t("form.conf.toggle")}
          </label>
          {withConf && (
            <div className="mt-4">
              <div className="flex items-end justify-between">
                <label htmlFor="conf" className="display text-5xl numeral">
                  {confidence}%
                </label>
                <span className="kicker text-muted">{t(confLabel as Key)}</span>
              </div>
              <input id="conf" type="range" min={50} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} className="mt-3 w-full accent-[#ff4a1c]" />
              <p className="mt-2 text-xs text-muted">{t("form.conf.hint")}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-bad">
          {t(error)}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div key="confirm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border-[1.5px] border-ink bg-signal/25 p-4">
            <p className="text-sm font-semibold">{t("form.confirm.t")}</p>
            <div className="mt-3 flex gap-2.5">
              <button type="button" disabled={pending} onClick={submit} className="btn btn-signal flex-1 px-4 py-3.5 text-sm">
                {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Lock size={16} aria-hidden />}
                {pending ? t("form.working") : t("form.confirm.go")}
              </button>
              <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="btn btn-line px-5 py-3.5 text-sm">
                {t("common.back")}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button key="go" type="submit" disabled={!ready} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="btn btn-signal w-full px-4 py-4 text-base">
            <Lock size={18} aria-hidden /> {t("form.submit")}
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  );
}
