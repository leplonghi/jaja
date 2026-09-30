"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { reportContent } from "@/app/actions";
import type { Key } from "@/i18n";
import { useI18n } from "@/i18n/client";

export function ReportButton({ topicId, predictionId }: { topicId: string; predictionId: string | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [pending, start] = useTransition();

  if (done) return <span className="text-xs font-medium text-muted">{t("pred.reported")}</span>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
        <Flag size={12} aria-hidden /> {t("pred.report")}
      </button>
    );
  return (
    <form
      className="flex w-full flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await reportContent(topicId, predictionId, reason);
          if (r.ok) setDone(true);
          else setError(r.error);
        });
      }}
    >
      <input
        aria-label={t("pred.reportWhy")}
        placeholder={t("pred.reportWhy")}
        value={reason}
        maxLength={500}
        onChange={(e) => setReason(e.target.value)}
        className="field !rounded-full !px-4 !py-2 text-xs sm:w-64 sm:flex-none"
      />
      <button type="submit" disabled={reason.trim().length < 3 || pending} className="btn btn-ink px-4 py-2 text-xs">
        {t("pred.reportSend")}
      </button>
      {error && <span className="text-xs font-medium text-bad">{t(error)}</span>}
    </form>
  );
}
