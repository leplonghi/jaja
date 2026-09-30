"use client";

import { useState } from "react";
import { BadgeCheck, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { computeCommitment } from "@/lib/hash";
import type { Prediction } from "@/lib/types";

/** Recalcula o SHA-256 no navegador e compara com o hash publicado no lacre. */
export function VerifyButton({ prediction }: { prediction: Prediction }) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "bad">("idle");

  async function verify() {
    setState("busy");
    try {
      const h = await computeCommitment(prediction);
      setState(h === prediction.commitment ? "ok" : "bad");
    } catch {
      setState("bad");
    }
  }

  if (state === "ok")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-good" role="status">
        <ShieldCheck size={14} aria-hidden /> Lacre íntegro: o hash confere
      </span>
    );
  if (state === "bad")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bad" role="alert">
        <ShieldAlert size={14} aria-hidden /> O hash não confere
      </span>
    );
  return (
    <button onClick={verify} disabled={state === "busy"} className="inline-flex items-center gap-1.5 text-xs font-semibold text-iris hover:underline">
      {state === "busy" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <BadgeCheck size={14} aria-hidden />}
      Verificar lacre
    </button>
  );
}
