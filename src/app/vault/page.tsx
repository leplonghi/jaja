import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { PredictionCard } from "@/components/PredictionCard";
import { StatsRow } from "@/components/StatsRow";
import { EmptyState, Tag } from "@/components/ui";
import { getT } from "@/i18n/server";
import { getVault, getViewer } from "@/lib/data";
import { topicPhase } from "@/lib/format";
import { phaseLabel } from "@/lib/labels";
import { computeStats } from "@/lib/stats";
import { IS_DEMO } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("vault.title") };
}

export default async function VaultPage() {
  const [{ t }, viewer] = await Promise.all([getT(), getViewer()]);
  if (!viewer) {
    if (IS_DEMO) {
      return (
        <EmptyState title={t("vault.title")} body={t("vault.demo")}>
          <Link href="/explore" className="btn btn-signal px-6 py-3 text-sm">
            {t("nav.explore")}
          </Link>
        </EmptyState>
      );
    }
    redirect("/login?next=/vault");
  }
  if (!viewer.onboarded) redirect("/welcome?next=/vault");

  const items = await getVault();
  const stats = computeStats(items);
  const waiting = items.filter((i) => i.topic.status === "open" && !i.topic.revealed);
  const done = items.filter((i) => i.topic.revealed);
  const canceled = items.filter((i) => i.topic.status === "canceled");

  return (
    <div className="space-y-12">
      <header>
        <h1 className="display text-7xl sm:text-9xl">{t("vault.title")}</h1>
        <p className="mt-3 max-w-2xl text-ink-2">{t("vault.sub")}</p>
      </header>

      <StatsRow stats={stats} pending={waiting.length} />

      {items.length === 0 && (
        <EmptyState title={t("vault.empty.t")} body={t("vault.empty.b")}>
          <Link href="/new" className="btn btn-signal px-6 py-3 text-sm">
            {t("nav.new")}
          </Link>
        </EmptyState>
      )}

      {waiting.length > 0 && (
        <section aria-labelledby="waiting">
          <h2 id="waiting" className="display flex items-center gap-3 text-5xl sm:text-6xl">
            <Lock size={30} aria-hidden /> {t("vault.waiting")}
          </h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {waiting.map(({ prediction, topic }) => (
              <div key={prediction.id} className="space-y-2">
                <div className="flex items-center justify-between px-1 text-xs text-muted">
                  <Tag tone={topicPhase(topic) === "open" ? "signal" : "line"}>{phaseLabel(t, topic)}</Tag>
                  {topicPhase(topic) === "open" && <Countdown to={topic.locks_at} className="font-mono font-semibold text-ink" />}
                </div>
                <PredictionCard prediction={prediction} topic={topic} showTopic />
              </div>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section aria-labelledby="done">
          <h2 id="done" className="display text-5xl sm:text-6xl">
            {t("vault.done")}
          </h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {done.map(({ prediction, topic }) => (
              <PredictionCard key={prediction.id} prediction={prediction} topic={topic} showTopic />
            ))}
          </div>
        </section>
      )}

      {canceled.length > 0 && (
        <section aria-labelledby="canceled">
          <h2 id="canceled" className="display text-5xl text-muted sm:text-6xl">
            {t("vault.canceled")}
          </h2>
          <div className="mt-6 grid gap-5 opacity-70 lg:grid-cols-2">
            {canceled.map(({ prediction, topic }) => (
              <PredictionCard key={prediction.id} prediction={prediction} topic={topic} showTopic />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
