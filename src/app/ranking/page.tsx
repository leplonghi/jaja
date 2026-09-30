import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/ui";
import { getT } from "@/i18n/server";
import { getLeaderboard } from "@/lib/data";
import { cn } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("rank.title") };
}

export default async function RankingPage() {
  const [{ t }, rows] = await Promise.all([getT(), getLeaderboard(100)]);
  return (
    <div>
      <h1 className="display text-7xl sm:text-9xl">{t("rank.title")}</h1>
      <p className="mt-3 max-w-2xl text-ink-2">{t("rank.sub")}</p>

      <div className="mt-10">
        {rows.length === 0 ? (
          <EmptyState title={t("rank.empty.t")} body={t("rank.empty.b")} />
        ) : (
          <div className="sheet overflow-hidden">
            <div className="kicker hidden grid-cols-[3.5rem_1fr_6rem_6rem_6rem] gap-4 border-b-[1.5px] border-ink px-5 py-3 text-muted sm:grid">
              <span>#</span>
              <span>{t("rank.col.name")}</span>
              <span className="text-right">{t("rank.col.acc")}</span>
              <span className="text-right">{t("rank.col.total")}</span>
              <span className="text-right">{t("rank.col.brier")}</span>
            </div>
            <ol>
              {rows.map((r, i) => (
                <li key={r.user_id} className="border-b border-ink/20 last:border-0">
                  <Link
                    href={`/u/${r.handle}`}
                    className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-4 py-4 transition hover:bg-paper-2 sm:grid-cols-[3.5rem_1fr_6rem_6rem_6rem] sm:gap-4 sm:px-5"
                  >
                    <span className={cn("display text-4xl", i === 0 && "text-signal")}>{i === 0 ? <Trophy size={28} aria-label="1" /> : i + 1}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={r.display_name} src={r.avatar_url} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{r.display_name}</span>
                        <span className="block truncate text-xs text-muted">@{r.handle}</span>
                      </span>
                    </span>
                    <span className="display text-right text-3xl numeral sm:text-2xl">{r.accuracy.toFixed(0)}%</span>
                    <span className="hidden text-right text-muted numeral sm:block">
                      {r.hits}/{r.total}
                    </span>
                    <span className="hidden text-right font-mono text-sm text-muted numeral sm:block">{r.brier == null ? "—" : r.brier.toFixed(3)}</span>
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
