import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EventForm, FreeForm } from "@/components/NewForms";
import { getT } from "@/i18n/server";
import { getViewer } from "@/lib/data";
import { cn } from "@/lib/format";
import { IS_DEMO } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("new.title") };
}

const TYPES = ["free", "challenge", "event"] as const;

export default async function NewPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [sp, { t }, viewer] = await Promise.all([searchParams, getT(), getViewer()]);
  if (!IS_DEMO) {
    if (!viewer) redirect("/login?next=/new");
    if (!viewer.onboarded) redirect("/welcome?next=/new");
  }
  const type = (TYPES.find((x) => x === sp.type) ?? "free") as (typeof TYPES)[number];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display text-7xl sm:text-9xl">{t("new.title")}</h1>
      <p className="mt-3 mb-8 text-ink-2">{t("new.sub")}</p>
      {IS_DEMO && <div className="mb-6 rounded-2xl border-[1.5px] border-ink bg-signal/25 px-4 py-3 text-sm font-medium">{t("new.demoBlock")}</div>}

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label={t("new.title")}>
        {TYPES.map((x) => (
          <Link key={x} href={`/new?type=${x}`} aria-current={type === x ? "page" : undefined} className={cn("btn shrink-0 px-5 py-3 text-sm", type === x ? "btn-ink" : "btn-line")}>
            {t(`new.tab.${x}`)}
          </Link>
        ))}
      </nav>

      {type === "event" ? <EventForm demo={IS_DEMO} /> : <FreeForm key={type} challenge={type === "challenge"} />}
    </div>
  );
}
