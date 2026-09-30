import Link from "next/link";
import { Lock, Users } from "lucide-react";
import { getT } from "@/i18n/server";
import { formatDateTime, isChallenge, topicPhase } from "@/lib/format";
import { kindLabel, phaseLabel } from "@/lib/labels";
import type { Topic } from "@/lib/types";
import { Countdown } from "./Countdown";
import { Tag } from "./ui";

export async function TopicCard({ topic }: { topic: Topic }) {
  const { t, tp, locale } = await getT();
  const phase = topicPhase(topic);
  return (
    <Link href={`/t/${topic.id}`} className="sheet sheet-hover group flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={phase === "open" ? "signal" : phase === "revealed" ? "ink" : "line"}>{phaseLabel(t, topic)}</Tag>
        <Tag>{kindLabel(t, topic)}</Tag>
        {topic.is_electoral && <Tag tone="bad">{t("tag.electoral")}</Tag>}
      </div>

      <h3 className="display-mid mt-4 text-[1.6rem] text-balance">{topic.title}</h3>

      {topic.options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {topic.options.map((o) => (
            <span key={o.id} className="rounded-full border border-ink/40 px-2.5 py-0.5 text-xs">
              {o.label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-6 text-sm">
        <div className="flex items-center gap-1.5">
          <Users size={15} aria-hidden />
          <span className="font-semibold numeral">{tp("count.seals", topic.seals)}</span>
        </div>
        {phase === "open" ? (
          <div className="text-right">
            <div className="kicker text-muted">{t("card.closesIn")}</div>
            <Countdown to={topic.locks_at} className="font-mono text-sm font-semibold" />
          </div>
        ) : phase === "waiting" ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <Lock size={13} aria-hidden />
            {topic.kind === "free"
              ? topic.reveal_at
                ? t("card.revealsOn", { date: formatDateTime(topic.reveal_at, locale) })
                : t("card.revealsManual")
              : t("card.waitingResult")}
          </span>
        ) : (
          <span className="text-xs text-muted">
            {t("card.revealedOn", { date: formatDateTime(topic.resolved_at ?? topic.revealed_at ?? topic.reveal_at ?? topic.created_at, locale) })}
          </span>
        )}
      </div>
      {isChallenge(topic) && phase === "open" && (
        <div className="kicker mt-3 border-t border-ink/20 pt-3 text-muted">{t("topic.joinUntil", { date: formatDateTime(topic.locks_at, locale) })}</div>
      )}
    </Link>
  );
}
