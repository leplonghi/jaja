import type { UserStats } from "@/lib/types";
import { StatTile } from "./ui";

export function StatsRow({ stats, pending }: { stats: UserStats; pending: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile label="Lacrados" value={String(pending)} hint="aguardando revelação" />
      <StatTile label="Acertos" value={stats.total ? `${stats.hits}/${stats.total}` : "—"} />
      <StatTile label="Taxa de acerto" value={stats.accuracy === null ? "—" : `${stats.accuracy.toFixed(0)}%`} />
      <StatTile label="Sequência 🔥" value={String(stats.streak)} hint={stats.streak === 1 ? "acerto seguido" : "acertos seguidos"} />
      <StatTile label="Brier score" value={stats.brier === null ? "—" : stats.brier.toFixed(3)} hint="menor é melhor" />
    </div>
  );
}
