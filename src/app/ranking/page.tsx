import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/ui";
import { getLeaderboard } from "@/lib/data";
import { cn } from "@/lib/format";

export const metadata: Metadata = { title: "Ranking" };

export default async function RankingPage() {
  const rows = await getLeaderboard(100);
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ranking dos videntes</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Ordenado pela taxa de acerto. O <b className="text-fg">Brier score</b> mede a calibragem: 0 é perfeito, 0,25 é o mesmo que chutar sempre 50%. Precisa de
        3 palpites revelados para entrar.
      </p>

      <div className="mt-8">
        {rows.length === 0 ? (
          <EmptyState title="O ranking ainda está vazio" body="Assim que os primeiros eventos forem resolvidos, os melhores palpiteiros aparecem aqui." />
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[3rem_1fr_6rem_6rem_6rem] gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wider text-faint sm:grid">
              <span>#</span>
              <span>Palpiteiro</span>
              <span className="text-right">Acerto</span>
              <span className="text-right">Palpites</span>
              <span className="text-right">Brier</span>
            </div>
            <ol>
              {rows.map((r, i) => (
                <li key={r.user_id} className="border-b border-line last:border-0">
                  <Link
                    href={`/u/${r.handle}`}
                    className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 px-4 py-4 transition hover:bg-white/[0.04] sm:grid-cols-[3rem_1fr_6rem_6rem_6rem] sm:gap-4 sm:px-5"
                  >
                    <span className={cn("grid size-8 place-items-center rounded-lg text-sm font-bold", i < 3 ? "bg-gold/15 text-gold" : "text-muted")}>
                      {i === 0 ? <Trophy size={16} aria-label="1º lugar" /> : i + 1}
                    </span>
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={r.display_name} src={r.avatar_url} size={38} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{r.display_name}</span>
                        <span className="block truncate text-xs text-muted">@{r.handle}</span>
                      </span>
                    </span>
                    <span className="text-right text-lg font-bold tabular-nums sm:text-base">{r.accuracy.toFixed(0)}%</span>
                    <span className="hidden text-right tabular-nums text-muted sm:block">
                      {r.hits}/{r.total}
                    </span>
                    <span className="hidden text-right font-mono text-sm tabular-nums text-muted sm:block">{r.brier.toFixed(3)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
