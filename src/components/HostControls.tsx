"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, Eye, Loader2 } from "lucide-react";
import { cancelTopic, revealNow } from "@/app/actions";
import type { Key } from "@/i18n";
import { useI18n } from "@/i18n/client";

/** Controles de quem criou uma previsão livre: revelar antes da data, ou cancelar. */
export function HostControls({ topicId, electoralHold, canReveal }: { topicId: string; electoralHold: boolean; canReveal: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirm, setConfirm] = useState<"reveal" | "cancel" | null>(null);
  const [error, setError] = useState<Key | null>(null);
  const [pending, start] = useTransition();

  function run(kind: "reveal" | "cancel") {
    setError(null);
    start(async () => {
      const r = kind === "reveal" ? await revealNow(topicId) : await cancelTopic(topicId);
      if (r.ok) router.refresh();
      else {
        setError(r.error);
        setConfirm(null);
      }
    });
  }

  return (
    <section className="sheet p-5" aria-labelledby="host-title">
      <h2 id="host-title" className="display-mid text-2xl">
        {t("host.title")}
      </h2>
      {electoralHold ? (
        <p className="mt-2 text-sm text-muted">{t("host.electoralHold")}</p>
      ) : (
        canReveal && <p className="mt-2 text-sm text-muted">{t("host.revealHint")}</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-bad">
          {t(error)}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2.5">
        {canReveal &&
          !electoralHold &&
          (confirm === "reveal" ? (
            <button onClick={() => run("reveal")} disabled={pending} className="btn btn-signal px-5 py-3 text-sm">
              {pending && <Loader2 size={16} className="animate-spin" aria-hidden />} {t("host.revealConfirm")}
            </button>
          ) : (
            <button onClick={() => setConfirm("reveal")} className="btn btn-ink px-5 py-3 text-sm">
              <Eye size={16} aria-hidden /> {t("host.revealNow")}
            </button>
          ))}
        {confirm === "cancel" ? (
          <button onClick={() => run("cancel")} disabled={pending} className="btn border-[1.5px] border-bad px-5 py-3 text-sm text-bad">
            {t("host.cancelConfirm")}
          </button>
        ) : (
          <button onClick={() => setConfirm("cancel")} className="btn btn-line px-5 py-3 text-sm">
            <Ban size={15} aria-hidden /> {t("host.cancel")}
          </button>
        )}
      </div>
    </section>
  );
}
