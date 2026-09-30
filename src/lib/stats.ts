import type { UserStats, VaultItem } from "./types";

const scored = (i: VaultItem) => i.topic.kind === "event" && i.topic.status === "resolved";
const hit = (i: VaultItem) => i.prediction.option_id === i.topic.winning_option_id;

/** Estatísticas a partir das previsões do próprio usuário. Só eventos resolvidos pontuam. */
export function computeStats(items: VaultItem[]): UserStats {
  const resolved = items
    .filter(scored)
    .sort((a, b) => +new Date(b.topic.resolved_at!) - +new Date(a.topic.resolved_at!));
  const hits = resolved.filter(hit).length;

  let streak = 0;
  for (const i of resolved) {
    if (!hit(i)) break;
    streak++;
  }

  const withConf = resolved.filter((i) => i.prediction.confidence != null);
  const brier = withConf.length
    ? withConf.reduce((sum, i) => sum + ((i.prediction.confidence! / 100) - (hit(i) ? 1 : 0)) ** 2, 0) / withConf.length
    : null;

  return {
    total: resolved.length,
    hits,
    accuracy: resolved.length ? Math.round((hits / resolved.length) * 1000) / 10 : null,
    streak,
    pending: items.filter((i) => i.topic.status === "open" && !i.topic.revealed).length,
    brier: brier === null ? null : Math.round(brier * 1000) / 1000,
  };
}
