import type { UserStats, VaultItem } from "./types";

/** Estatísticas a partir dos palpites do próprio usuário (já filtrados por RLS). */
export function computeStats(items: VaultItem[]): UserStats {
  const resolved = items
    .filter((i) => i.event.status === "resolved")
    .sort((a, b) => +new Date(b.event.resolved_at!) - +new Date(a.event.resolved_at!));

  const hit = (i: VaultItem) => i.prediction.option_id === i.event.winning_option_id;
  const hits = resolved.filter(hit).length;

  let streak = 0;
  for (const i of resolved) {
    if (!hit(i)) break;
    streak++;
  }

  const brier = resolved.length
    ? resolved.reduce((sum, i) => {
        const p = i.prediction.confidence / 100;
        return sum + (p - (hit(i) ? 1 : 0)) ** 2;
      }, 0) / resolved.length
    : null;

  return {
    total: resolved.length,
    hits,
    accuracy: resolved.length ? Math.round((hits / resolved.length) * 1000) / 10 : null,
    streak,
    pending: items.filter((i) => i.event.status === "open").length,
    brier: brier === null ? null : Math.round(brier * 1000) / 1000,
  };
}
