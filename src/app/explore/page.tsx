import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { TopicCard } from "@/components/TopicCard";
import { EmptyState } from "@/components/ui";
import { getT } from "@/i18n/server";
import { listTopics, type Tab } from "@/lib/data";
import { cn } from "@/lib/format";
import { CATEGORY_IDS } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("explore.title") };
}

const TABS: Tab[] = ["open", "waiting", "revealed"];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ tab?: string; cat?: string }> }) {
  const [sp, { t }] = await Promise.all([searchParams, getT()]);
  const tab = (TABS.find((x) => x === sp.tab) ?? "open") as Tab;
  const cat = CATEGORY_IDS.find((c) => c === sp.cat);
  const topics = await listTopics({ tab, category: cat, limit: 48 });

  const href = (next: { tab?: Tab; cat?: string | null }) => {
    const p = new URLSearchParams();
    const tb = next.tab ?? tab;
    const c = "cat" in next ? next.cat : cat;
    if (tb !== "open") p.set("tab", tb);
    if (c) p.set("cat", c);
    const qs = p.toString();
    return `/explore${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-7xl sm:text-9xl">{t("explore.title")}</h1>
          <p className="mt-3 text-ink-2">{t("explore.sub")}</p>
        </div>
        <Link href="/new" className="btn btn-signal px-6 py-3.5 text-sm">
          <Plus size={17} aria-hidden /> {t("nav.new")}
        </Link>
      </div>

      <nav className="mt-10 flex gap-2 overflow-x-auto pb-1" aria-label={t("explore.tabs")}>
        {TABS.map((x) => (
          <Link
            key={x}
            href={href({ tab: x })}
            aria-current={tab === x ? "page" : undefined}
            className={cn("btn shrink-0 px-5 py-3 text-sm", tab === x ? "btn-ink" : "btn-line")}
          >
            {t(`tab.${x}`)}
          </Link>
        ))}
      </nav>

      <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label={t("explore.cats")}>
        <Link href={href({ cat: null })} className={cn("kicker shrink-0 rounded-full border px-3.5 py-2", !cat ? "border-ink bg-signal" : "border-ink/40 hover:border-ink")}>
          {t("cat.all")}
        </Link>
        {CATEGORY_IDS.map((c) => (
          <Link key={c} href={href({ cat: c })} className={cn("kicker shrink-0 rounded-full border px-3.5 py-2", cat === c ? "border-ink bg-signal" : "border-ink/40 hover:border-ink")}>
            {t(`cat.${c}`)}
          </Link>
        ))}
      </nav>

      <div className="mt-10">
        {topics.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {topics.map((x) => (
              <TopicCard key={x.id} topic={x} />
            ))}
          </div>
        ) : (
          <EmptyState title={t("explore.empty.t")} body={t("explore.empty.b")}>
            <Link href="/new" className="btn btn-signal px-6 py-3 text-sm">
              {t("nav.new")}
            </Link>
          </EmptyState>
        )}
      </div>
    </div>
  );
}
