import { getT } from "@/i18n/server";
import type { UserStats } from "@/lib/types";
import { StatTile } from "./ui";

export async function StatsRow({ stats, pending }: { stats: UserStats; pending: number }) {
  const { t } = await getT();
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile label={t("stats.pending")} value={String(pending)} hint={t("stats.pending.hint")} />
      <StatTile label={t("stats.hits")} value={stats.total ? `${stats.hits}/${stats.total}` : "—"} />
      <StatTile label={t("stats.acc")} value={stats.accuracy === null ? "—" : `${stats.accuracy.toFixed(0)}%`} />
      <StatTile label={t("stats.streak")} value={String(stats.streak)} hint={t("stats.streak.hint")} />
      <StatTile label={t("stats.brier")} value={stats.brier === null ? "—" : stats.brier.toFixed(3)} hint={t("stats.brier.hint")} />
    </div>
  );
}
