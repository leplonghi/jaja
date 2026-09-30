import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { PredictionCard } from "@/components/PredictionCard";
import { StatsRow } from "@/components/StatsRow";
import { EmptyState, PhaseBadge } from "@/components/ui";
import { getCurrentUser, getVault } from "@/lib/data";
import { phaseOf } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import { IS_DEMO } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Meu cofre" };

export default async function VaultPage() {
  const user = await getCurrentUser();
  if (!user) {
    if (IS_DEMO) {
      return (
        <EmptyState title="Seu cofre aparece aqui" body="No modo demonstração não há conta. Configure o Supabase para lacrar de verdade.">
          <Link href="/eventos" className="btn-primary rounded-xl px-5 py-3 text-sm">
            Explorar eventos
          </Link>
        </EmptyState>
      );
    }
    redirect("/login?next=/cofre");
  }

  const items = await getVault(user.id);
  const stats = computeStats(items);
  const waiting = items.filter((i) => i.event.status === "open");
  const done = items.filter((i) => i.event.status === "resolved");
  const canceled = items.filter((i) => i.event.status === "canceled");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Meu cofre</h1>
        <p className="mt-2 text-muted">Tudo que você lacrou, com hash e prazo. Só você enxerga o conteúdo até a revelação.</p>
      </header>

      <StatsRow stats={stats} pending={waiting.length} />

      {items.length === 0 && (
        <EmptyState title="Seu cofre está vazio" body="Lacre seu primeiro palpite. Daqui a alguns dias você vai agradecer por ter avisado antes.">
          <Link href="/eventos" className="btn-primary rounded-xl px-5 py-3 text-sm">
            Escolher um evento
          </Link>
        </EmptyState>
      )}

      {waiting.length > 0 && (
        <section aria-labelledby="waiting">
          <h2 id="waiting" className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Lock size={18} className="text-gold" aria-hidden /> Aguardando revelação
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {waiting.map(({ prediction, event }) => {
              const phase = phaseOf(event);
              return (
                <div key={prediction.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1 text-xs text-muted">
                    <PhaseBadge phase={phase} />
                    {phase === "open" ? (
                      <span>
                        prazo em <Countdown to={event.locks_at} className="font-mono font-semibold text-gold" />
                      </span>
                    ) : (
                      <span>aguardando o resultado</span>
                    )}
                  </div>
                  <PredictionCard prediction={prediction} event={event} showEvent />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section aria-labelledby="done">
          <h2 id="done" className="mb-4 text-xl font-bold">
            Revelados
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {done.map(({ prediction, event }) => (
              <PredictionCard key={prediction.id} prediction={prediction} event={event} showEvent />
            ))}
          </div>
        </section>
      )}

      {canceled.length > 0 && (
        <section aria-labelledby="canceled">
          <h2 id="canceled" className="mb-4 text-xl font-bold text-muted">
            Cancelados
          </h2>
          <div className="grid gap-4 opacity-70 lg:grid-cols-2">
            {canceled.map(({ prediction, event }) => (
              <PredictionCard key={prediction.id} prediction={prediction} event={event} showEvent />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
