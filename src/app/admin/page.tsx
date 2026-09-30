import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReleaseButton, ResolveForm, ReviewButtons } from "@/components/AdminControls";
import { Tag } from "@/components/ui";
import { getT } from "@/i18n/server";
import { getAdminQueue, getViewer } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { IS_DEMO } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("admin.title") };
}

function Section({ title, n, empty, children }: { title: string; n: number; empty: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="display flex items-baseline gap-3 text-5xl">
        {title} <span className="kicker rounded-full border border-ink px-2.5 py-1">{n}</span>
      </h2>
      {n === 0 ? <p className="text-sm text-muted">{empty}</p> : <div className="space-y-4">{children}</div>}
    </section>
  );
}

export default async function AdminPage() {
  const [{ t, locale }, viewer] = await Promise.all([getT(), getViewer()]);
  if (!viewer && !IS_DEMO) redirect("/login?next=/admin");
  if (IS_DEMO || !viewer?.is_staff) return <p className="sheet p-6 text-sm font-medium">{t("admin.denied")}</p>;

  const q = await getAdminQueue();
  if (!q) return <p className="sheet p-6 text-sm font-medium">{t("admin.denied")}</p>;

  return (
    <div className="space-y-14">
      <header>
        <h1 className="display text-7xl sm:text-9xl">{t("admin.title")}</h1>
        <p className="mt-3 text-ink-2">{t("admin.sub")}</p>
      </header>

      <Section empty={t("admin.empty")} title={t("admin.pending")} n={q.pending_topics.length}>
        {q.pending_topics.map((x) => (
          <div key={x.id} className="sheet p-5">
            <div className="flex flex-wrap gap-2">
              <Tag>{t(`kind.${x.kind === "event" ? "event" : "free"}`)}</Tag>
              {x.is_electoral && <Tag tone="bad">{t("tag.electoral")}</Tag>}
            </div>
            <Link href={`/t/${x.id}`} className="display-mid mt-3 block text-2xl hover:underline">
              {x.title}
            </Link>
            {x.source_note && <p className="mt-1 text-sm text-muted">{t("admin.source", { source: x.source_note })}</p>}
            <div className="mt-4">
              <ReviewButtons kind="topic" id={x.id} />
            </div>
          </div>
        ))}
      </Section>

      <Section empty={t("admin.empty")} title={t("admin.flagged")} n={q.flagged_predictions.length}>
        {q.flagged_predictions.map((p) => (
          <div key={p.id} className="sheet p-5">
            <p className="kicker text-muted">
              @{p.handle} · {p.topic_title}
            </p>
            <p className="mt-3 whitespace-pre-wrap break-words">{p.body}</p>
            <div className="mt-4">
              <ReviewButtons kind="prediction" id={p.id} />
            </div>
          </div>
        ))}
      </Section>

      <Section empty={t("admin.empty")} title={t("admin.electoral")} n={q.electoral_to_release.length}>
        {q.electoral_to_release.map((x) => (
          <div key={x.id} className="sheet p-5">
            <Link href={`/t/${x.id}`} className="display-mid block text-2xl hover:underline">
              {x.title}
            </Link>
            <div className="mt-4">
              <ReleaseButton id={x.id} />
            </div>
          </div>
        ))}
      </Section>

      <Section empty={t("admin.empty")} title={t("admin.toResolve")} n={q.events_to_resolve.length}>
        {q.events_to_resolve.map((x) => (
          <div key={x.id} className="sheet p-5">
            <Link href={`/t/${x.id}`} className="display-mid block text-2xl hover:underline">
              {x.title}
            </Link>
            {x.source_note && <p className="mt-1 text-sm text-muted">{t("admin.source", { source: x.source_note })}</p>}
            <p className="kicker mt-2 text-muted">{t("topic.locksAt", { date: formatDateTime(x.locks_at, locale) })}</p>
            <div className="mt-4">
              <ResolveForm id={x.id} options={x.options} />
            </div>
          </div>
        ))}
      </Section>

      <Section empty={t("admin.empty")} title={t("admin.reports")} n={q.recent_reports.length}>
        {q.recent_reports.map((r) => (
          <div key={r.id} className="sheet p-4 text-sm">
            <Link href={r.prediction_id ? `/p/${r.prediction_id}` : `/t/${r.topic_id}`} className="font-semibold underline underline-offset-4">
              {formatDateTime(r.created_at, locale)}
            </Link>
            <p className="mt-1 text-ink-2">{r.reason}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}
