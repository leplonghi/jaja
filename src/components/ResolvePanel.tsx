"use client";

import { useState, useTransition } from "react";
import { Gavel, Loader2, Ban } from "lucide-react";
import { cancelEvent, resolveEvent } from "@/app/eventos/actions";
import { cn } from "@/lib/format";
import type { EventOption } from "@/lib/types";

/** Painel do criador: resolver (revelar tudo) ou cancelar o evento. */
export function ResolvePanel({
  eventId,
  options,
  canResolve,
}: {
  eventId: string;
  options: EventOption[];
  canResolve: boolean;
}) {
  const [winner, setWinner] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"resolve" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(kind: "resolve" | "cancel") {
    setError(null);
    start(async () => {
      const res = kind === "resolve" ? await resolveEvent(eventId, winner!) : await cancelEvent(eventId);
      if (!res.ok) {
        setError(res.error);
        setConfirm(null);
      }
    });
  }

  return (
    <section className="card border-gold/30 p-5 sm:p-6" aria-labelledby="resolve-title">
      <h2 id="resolve-title" className="flex items-center gap-2 text-lg font-semibold">
        <Gavel size={18} className="text-gold" aria-hidden /> Painel do criador
      </h2>

      {canResolve ? (
        <>
          <p className="mt-1 text-sm text-muted">
            O prazo acabou. Escolha o resultado real: todos os lacres serão revelados de uma vez e não há como desfazer.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setWinner(o.id);
                  setConfirm(null);
                }}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left text-sm font-semibold transition",
                  winner === o.id ? "border-gold/70 bg-gold/10" : "border-line bg-white/[0.03] text-muted hover:text-fg",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">Você poderá resolver o evento quando o prazo de lacres terminar.</p>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2.5">
        {canResolve &&
          (confirm === "resolve" ? (
            <button onClick={() => run("resolve")} disabled={pending} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm">
              {pending && <Loader2 size={16} className="animate-spin" aria-hidden />} Sim, revelar tudo
            </button>
          ) : (
            <button onClick={() => setConfirm("resolve")} disabled={!winner} className="btn-primary rounded-xl px-5 py-3 text-sm">
              Resolver e revelar
            </button>
          ))}
        {confirm === "cancel" ? (
          <button onClick={() => run("cancel")} disabled={pending} className="rounded-xl bg-bad/15 px-5 py-3 text-sm font-semibold text-bad ring-1 ring-bad/30">
            Confirmar cancelamento
          </button>
        ) : (
          <button onClick={() => setConfirm("cancel")} className="btn-ghost inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-muted">
            <Ban size={15} aria-hidden /> Cancelar evento
          </button>
        )}
      </div>
    </section>
  );
}
