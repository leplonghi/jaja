import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PredictionCard } from "@/components/PredictionCard";
import { ShareButton } from "@/components/ShareButton";
import { HashPill, Tag } from "@/components/ui";
import { getT } from "@/i18n/server";
import { getPredictionPage } from "@/lib/data";
import { timeAgo } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [page, { t }] = await Promise.all([getPredictionPage(id), getT()]);
  if (!page) return { title: "jaja" };
  const who = page.prediction.author?.display_name ?? "jaja";
  // Nunca inclui o conteúdo: só o rótulo público e o autor.
  return { title: `${who} · ${page.topic.title}`, description: t("pp.hashNote") };
}

/** Página pública de uma previsão: a prova de que a pessoa falou antes. */
export default async function PredictionProofPage({ params }: Props) {
  const { id } = await params;
  const page = await getPredictionPage(id);
  if (!page) notFound();
  const { topic, prediction } = page;
  const { t } = await getT();

  const revealed = topic.revealed;
  const refDate = topic.resolved_at ?? topic.revealed_at ?? topic.reveal_at;
  const leadDays = revealed && refDate ? Math.floor((+new Date(refDate) - +new Date(prediction.created_at) + 60_000) / 86_400_000) : null;
  const leadText = leadDays === null ? null : leadDays >= 2 ? t("pp.lead", { days: leadDays }) : leadDays === 1 ? t("pp.leadOne") : t("pp.leadSame");
  const author = prediction.author;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="ink-block rounded-[2rem] p-6 text-center sm:p-10">
        <Tag tone="signal">{revealed ? t("pp.revealed") : t("pp.sealed")}</Tag>
        <h1 className="display mt-5 text-[clamp(2.4rem,9vw,4.6rem)] text-balance">{topic.title}</h1>

        {author && (
          <Link href={`/u/${author.handle}`} className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-paper/40 py-1.5 pl-1.5 pr-4 text-sm hover:bg-paper/10">
            <Avatar name={author.display_name} src={author.avatar_url} size={30} />
            <span>{t("pp.by", { name: author.display_name, when: timeAgo(prediction.created_at, t) })}</span>
          </Link>
        )}
        {leadText && <div className="display mt-6 text-5xl text-signal sm:text-6xl">{leadText}</div>}

        <div className="mt-6 flex justify-center">
          <HashPill hash={prediction.commitment} className="!border-paper/40 !bg-transparent" />
        </div>
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-paper/60">{t("pp.hashNote")}</p>
      </div>

      {prediction.held && <p className="sheet p-5 text-sm font-medium">{t("pp.held")}</p>}
      {!prediction.held && prediction.body !== undefined && revealed && <PredictionCard prediction={prediction} topic={topic} author={author} />}

      {!revealed && (
        <div className="sheet flex items-start gap-3 p-5 text-sm">
          <Lock size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>{t("pp.locked")}</p>
        </div>
      )}

      {!revealed && prediction.mine && prediction.body !== undefined && (
        <div>
          <h2 className="kicker mb-3 text-muted">{t("pp.only")}</h2>
          <PredictionCard prediction={prediction} topic={topic} />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {prediction.mine && (
          <ShareButton path={`/p/${prediction.id}`} text={t("topic.shareProofText", { title: topic.title })} label={t("topic.shareProof")} copiedLabel={t("share.copied")} primary />
        )}
        <Link href={`/t/${topic.id}`} className={prediction.mine ? "btn btn-line px-5 py-3.5 text-sm" : "btn btn-signal px-6 py-3.5 text-sm"}>
          {prediction.mine || revealed ? t("pp.event") : t("pp.cta")}
        </Link>
      </div>
    </div>
  );
}
