import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ExternalLink, Lock, Trophy, UserRound } from "lucide-react";
import { BigCountdown } from "@/components/Countdown";
import { HostControls } from "@/components/HostControls";
import { PredictForm } from "@/components/PredictForm";
import { PredictionCard } from "@/components/PredictionCard";
import { RevealGate } from "@/components/RevealGate";
import { SealsList } from "@/components/SealsList";
import { ShareButton } from "@/components/ShareButton";
import { Tag } from "@/components/ui";
import { getT } from "@/i18n/server";
import { getPredictions, getTopic, getViewer } from "@/lib/data";
import { formatDateTime, isChallenge, topicPhase } from "@/lib/format";
import { kindLabel, phaseLabel } from "@/lib/labels";
import { IS_DEMO } from "@/lib/supabase/env";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [topic, { tp }] = await Promise.all([getTopic(id), getT()]);
  if (!topic) return { title: "jaja" };
  // Nunca inclui o conteúdo das previsões: só o rótulo público e a contagem.
  return { title: topic.title, description: tp("count.seals", topic.seals) };
}

export default async function TopicPage({ params }: Props) {
  const { id } = await params;
  const topic = await getTopic(id);
  if (!topic) notFound();

  const [{ t, tp, locale }, viewer, predictions] = await Promise.all([getT(), getViewer(), getPredictions(id)]);
  const phase = topicPhase(topic);
  const challenge = isChallenge(topic);
  const isHost = !!viewer && viewer.id === topic.host?.id;
  const mine = predictions.find((p) => p.mine);
  const canJoin = phase === "open" && !mine && (topic.kind === "event" || topic.allow_join);
  const winner = topic.options.find((o) => o.id === topic.winning_option_id);

  const revealedList = [...predictions].sort((a, b) => {
    const hitA = a.option_id && a.option_id === topic.winning_option_id ? 1 : 0;
    const hitB = b.option_id && b.option_id === topic.winning_option_id ? 1 : 0;
    return hitB - hitA || (b.confidence ?? 0) - (a.confidence ?? 0);
  });
  const scoredCount = predictions.filter((p) => p.option_id).length;
  const hits = predictions.filter((p) => p.option_id && p.option_id === topic.winning_option_id).length;

  const shareText = challenge ? t("topic.inviteText", { title: topic.title }) : t("topic.eventShare", { title: topic.title });

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-8">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={phase === "open" ? "signal" : phase === "revealed" ? "ink" : "line"}>{phaseLabel(t, topic)}</Tag>
            <Tag>{kindLabel(t, topic)}</Tag>
            {topic.is_electoral && <Tag tone="bad">{t("tag.electoral")}</Tag>}
            <Tag>{t(`cat.${topic.category}`)}</Tag>
          </div>
          <h1 className="display mt-5 text-[clamp(2.6rem,8vw,5.6rem)] text-balance">{topic.title}</h1>
          {topic.description && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">{topic.description}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-2">
            {topic.host && (
              <Link href={`/u/${topic.host.handle}`} className="inline-flex items-center gap-1.5 font-medium hover:underline">
                <UserRound size={15} aria-hidden /> {t("topic.by", { handle: topic.host.handle })}
              </Link>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={15} aria-hidden />
              {challenge ? t("topic.joinUntil", { date: formatDateTime(topic.locks_at, locale) }) : topic.kind === "event" ? t("topic.locksAt", { date: formatDateTime(topic.locks_at, locale) }) : null}
              {topic.kind === "free" && !challenge && (topic.reveal_at ? t("topic.revealsOn", { date: formatDateTime(topic.reveal_at, locale) }) : t("topic.revealsManual"))}
            </span>
            {topic.kind === "free" && challenge && (
              <span>{topic.reveal_at ? t("topic.revealsOn", { date: formatDateTime(topic.reveal_at, locale) }) : t("topic.revealsManual")}</span>
            )}
            {topic.kind === "event" && topic.resolve_by && <span>{t("topic.resolveBy", { date: formatDateTime(topic.resolve_by, locale) })}</span>}
          </div>

          {topic.source_note && (
            <div className="mt-4 rounded-2xl border border-ink/30 bg-paper-2 px-4 py-3 text-sm">
              <span className="kicker text-muted">{t("topic.source")}</span>
              <p className="mt-1">{topic.source_note}</p>
              {topic.source_url && (
                <a href={topic.source_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1 font-medium underline underline-offset-4">
                  {t("topic.sourceLink")} <ExternalLink size={12} aria-hidden />
                </a>
              )}
            </div>
          )}
          {topic.is_electoral && <p className="mt-4 rounded-2xl border-[1.5px] border-bad px-4 py-3 text-sm font-medium text-bad">{t("topic.electoralNote")}</p>}
        </header>

        {phase === "open" && (
          <section className="ink-block overflow-hidden rounded-[1.75rem] p-6 sm:p-8" aria-label={t("card.closesIn")}>
            <div className="kicker flex items-center gap-2 text-paper/70">
              <span className="inline-block size-2 animate-blink rounded-full bg-signal" />
              {t("card.closesIn")}
            </div>
            <BigCountdown to={topic.locks_at} className="mt-5 text-[clamp(2.8rem,12vw,7rem)]" />
          </section>
        )}

        {phase === "pending" && <p className="sheet p-5 text-sm font-medium">{t("topic.pending")}</p>}
        {phase === "canceled" && <p className="sheet p-5 text-sm font-medium">{t("topic.canceled")}</p>}
        {phase === "waiting" && (
          <p className="sheet flex items-start gap-3 p-5 text-sm font-medium">
            <Lock size={18} className="mt-0.5 shrink-0" aria-hidden />
            {topic.kind === "event" ? t("topic.locked") : t("topic.lockedFree")}
          </p>
        )}

        {mine && phase !== "revealed" && (
          <section aria-labelledby="mine">
            <h2 id="mine" className="display-mid flex flex-wrap items-center gap-3 text-3xl">
              {t("topic.mine")}
              <Tag tone="ink">{t("topic.onlyYou")}</Tag>
            </h2>
            <div className="mt-4">
              <PredictionCard prediction={mine} topic={topic} />
            </div>
            <div className="mt-4">
              <ShareButton
                path={`/p/${mine.id}`}
                text={t("topic.shareProofText", { title: topic.title })}
                label={t("topic.shareProof")}
                copiedLabel={t("share.copied")}
                primary
              />
            </div>
          </section>
        )}

        {canJoin && (
          <section aria-labelledby="predict">
            <h2 id="predict" className="display text-5xl sm:text-6xl">
              {challenge ? t("topic.joinTitle") : t("topic.predictTitle")}
            </h2>
            <div className="mt-5">
              <PredictForm topic={topic} loggedIn={!!viewer || IS_DEMO} onboarded={viewer?.onboarded ?? IS_DEMO} />
            </div>
          </section>
        )}

        {phase === "revealed" && (
          <RevealGate id={topic.id} title={topic.title}>
            <div className="space-y-8">
              {topic.kind === "event" && winner && (
                <div className="sheet ink-block p-6 sm:p-10">
                  <div className="kicker flex items-center gap-2 text-signal">
                    <Trophy size={14} aria-hidden /> {t("topic.result")}
                  </div>
                  <div className="display mt-3 text-[clamp(3.4rem,14vw,8.5rem)]">{winner.label}</div>
                  <p className="mt-3 text-paper/80">
                    {scoredCount > 0 ? t("topic.hits", { hits, total: scoredCount, pct: Math.round((hits / scoredCount) * 100) }) : t("topic.noPredictions")}
                  </p>
                </div>
              )}
              <section aria-labelledby="reveals">
                <h2 id="reveals" className="display text-5xl sm:text-6xl">
                  {t("topic.revealedTitle")}
                </h2>
                <div className="mt-5 space-y-4">
                  {revealedList.map((p) => (
                    <PredictionCard key={p.id} prediction={p} topic={topic} author={{ handle: p.handle ?? "", display_name: p.display_name ?? "", avatar_url: p.avatar_url ?? null }} />
                  ))}
                </div>
              </section>
            </div>
          </RevealGate>
        )}
      </div>

      <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
        {phase !== "revealed" && phase !== "pending" && phase !== "blocked" && <SealsList topicId={topic.id} predictions={predictions} total={topic.seals} />}
        {isHost && topic.kind === "free" && phase !== "revealed" && phase !== "canceled" && phase !== "pending" && (
          <HostControls topicId={topic.id} electoralHold={topic.is_electoral && !topic.released} canReveal />
        )}
        {phase !== "pending" && phase !== "blocked" && (
          <ShareButton path={`/t/${topic.id}`} text={shareText} label={t("topic.invite")} copiedLabel={t("share.copied")} className="w-full" />
        )}
        <p className="kicker text-muted">{tp("count.seals", topic.seals)}</p>
      </aside>
    </div>
  );
}
