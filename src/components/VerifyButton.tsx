"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { computeCommitment } from "@/lib/hash";
import type { Prediction } from "@/lib/types";

/** Recalcula o SHA-256 no navegador e compara com o código publicado quando a previsão foi guardada. */
export function VerifyButton({ prediction }: { prediction: Prediction }) {
  const { t } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "ok" | "bad">("idle");

  async function verify() {
    setState("busy");
    try {
      setState((await computeCommitment(prediction)) === prediction.commitment ? "ok" : "bad");
    } catch {
      setState("bad");
    }
  }

  if (state === "ok")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ok" role="status">
        <ShieldCheck size={14} aria-hidden /> {t("pred.verified")}
      </span>
    );
  if (state === "bad")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bad" role="alert">
        <ShieldAlert size={14} aria-hidden /> {t("pred.badHash")}
      </span>
    );
  return (
    <button onClick={verify} disabled={state === "busy"} className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4">
      {state === "busy" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <BadgeCheck size={14} aria-hidden />}
      {t("pred.verify")}
    </button>
  );
}
