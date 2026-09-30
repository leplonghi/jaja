"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { releaseElectoral, resolveEvent, reviewPrediction, reviewTopic } from "@/app/actions";
import type { Key } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/format";
import type { TopicOption } from "@/lib/types";

type Res = { ok: true } | { ok: false; error: Key };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<Key | null>(null);
  const run = (fn: () => Promise<Res>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  };
  return { pending, error, run };
}

export function ReviewButtons({ kind, id }: { kind: "topic" | "prediction"; id: string }) {
  const { t } = useI18n();
  const { pending, error, run } = useAction();
  const act = (approve: boolean) => run(() => (kind === "topic" ? reviewTopic(id, approve) : reviewPrediction(id, approve)));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button disabled={pending} onClick={() => act(true)} className="btn btn-signal px-4 py-2.5 text-sm">
        {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Check size={14} aria-hidden />} {t("admin.approve")}
      </button>
      <button disabled={pending} onClick={() => act(false)} className="btn btn-line px-4 py-2.5 text-sm">
        <X size={14} aria-hidden /> {t("admin.block")}
      </button>
      {error && <span className="text-xs font-semibold text-bad">{t(error)}</span>}
    </div>
  );
}

export function ReleaseButton({ id }: { id: string }) {
  const { t } = useI18n();
  const { pending, error, run } = useAction();
  return (
    <div className="flex items-center gap-2">
      <button disabled={pending} onClick={() => run(() => releaseElectoral(id))} className="btn btn-signal px-4 py-2.5 text-sm">
        {pending && <Loader2 size={14} className="animate-spin" aria-hidden />} {t("admin.release")}
      </button>
      {error && <span className="text-xs font-semibold text-bad">{t(error)}</span>}
    </div>
  );
}

export function ResolveForm({ id, options }: { id: string; options: TopicOption[] }) {
  const { t } = useI18n();
  const { pending, error, run } = useAction();
  const [winner, setWinner] = useState<string | null>(null);
  return (
    <div>
      <p className="kicker text-muted">{t("admin.pickWinner")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setWinner(o.id)}
            aria-pressed={winner === o.id}
            className={cn("btn px-4 py-2.5 text-sm", winner === o.id ? "btn-ink" : "btn-line")}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button disabled={!winner || pending} onClick={() => winner && run(() => resolveEvent(id, winner))} className="btn btn-signal px-5 py-2.5 text-sm">
          {pending && <Loader2 size={14} className="animate-spin" aria-hidden />} {t("admin.resolve")}
        </button>
        {error && <span className="text-xs font-semibold text-bad">{t(error)}</span>}
      </div>
    </div>
  );
}
