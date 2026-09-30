"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { sealPrediction } from "@/app/actions";
import { useI18n } from "@/i18n/client";
import type { Key } from "@/i18n";
import type { Topic } from "@/lib/types";
import { Countdown } from "./Countdown";

/** Palpite do dia: um toque registra a previsão (sem texto). */
export function DailyCard({ topic, loggedIn, onboarded }: { topic: Topic; loggedIn: boolean; onboarded: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  function pick(optionId: string) {
    if (!loggedIn) return router.push(`/login?next=${encodeURIComponent(`/t/${topic.id}`)}`);
    if (!onboarded) return router.push(`/welcome?next=${encodeURIComponent(`/t/${topic.id}`)}`);
    setError(null);
    setBusy(optionId);
    start(async () => {
      const r = await sealPrediction({ topicId: topic.id, optionId, body: "", confidence: null });
      setBusy(null);
      if (r.ok) setDone(true);
      else setError(r.error);
    });
  }

  return (
    <section className="sheet flex h-full flex-col p-6" aria-labelledby="daily-title">
      <div className="flex items-center justify-between gap-3">
        <span className="kicker text-signal-deep">{t("daily.kicker")}</span>
      </div>
      <Link href={`/t/${topic.id}`} id="daily-title" className="display-mid mt-3 block text-3xl text-balance hover:underline">
        {topic.title}
      </Link>
      <p className="mt-2 text-sm text-muted">
        {t("card.closesIn")} <Countdown to={topic.locks_at} className="font-mono font-semibold text-ink" />
      </p>

      {done ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border-[1.5px] border-ok bg-ok/10 p-4 text-sm font-medium text-ok" role="status">
          <Check size={20} aria-hidden /> {t("daily.done")}
        </div>
      ) : (
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {topic.options.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={busy !== null}
              onClick={() => pick(o.id)}
              className="btn btn-line justify-between px-5 py-4 text-left text-base"
            >
              {o.label}
              {busy === o.id && <Loader2 size={16} className="animate-spin" aria-hidden />}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-bad">
          {t(error)}
        </p>
      )}
      <Link href={`/t/${topic.id}`} className="mt-auto pt-5 text-sm font-medium underline underline-offset-4">
        {t("daily.more")}
      </Link>
    </section>
  );
}
