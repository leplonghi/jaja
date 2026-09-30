import Link from "next/link";
import { CircleCheck, CircleX, ExternalLink, Lock } from "lucide-react";
import { getT } from "@/i18n/server";
import { cn, timeAgo } from "@/lib/format";
import type { Prediction, Profile, Topic } from "@/lib/types";
import { Avatar } from "./Avatar";
import { ReportButton } from "./ReportButton";
import { HashPill } from "./ui";
import { VerifyButton } from "./VerifyButton";

type Author = Pick<Profile, "handle" | "display_name" | "avatar_url">;

/** Uma previsão: com conteúdo (autor ou revelada), retida pela moderação, ou ainda fechada. */
export async function PredictionCard({
  prediction,
  topic,
  author,
  showTopic = false,
}: {
  prediction: Prediction;
  topic: Topic;
  author?: Author | null;
  showTopic?: boolean;
}) {
  const { t } = await getT();
  const hasContent = prediction.body !== undefined;
  const option = topic.options.find((o) => o.id === prediction.option_id);
  const scored = topic.kind === "event" && topic.status === "resolved" && !!prediction.option_id;
  const hit = scored && prediction.option_id === topic.winning_option_id;
  const noteKey = prediction.moderation === "flagged" ? "topic.held" : prediction.moderation === "blocked" ? "topic.removed" : null;

  return (
    <article className={cn("sheet p-5", scored && (hit ? "border-ok bg-ok/5" : "border-bad bg-bad/5"))}>
      <header className="flex items-start justify-between gap-3">
        {author ? (
          <Link href={`/u/${author.handle}`} className="flex min-w-0 items-center gap-3">
            <Avatar name={author.display_name} src={author.avatar_url} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{author.display_name}</span>
              <span className="block truncate text-xs text-muted">@{author.handle}</span>
            </span>
          </Link>
        ) : (
          <span className="text-xs text-muted">{t("pred.sealedAt", { when: timeAgo(prediction.created_at, t) })}</span>
        )}
        {scored && (
          <span className={cn("kicker inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1", hit ? "border-ok text-ok" : "border-bad text-bad")}>
            {hit ? <CircleCheck size={13} aria-hidden /> : <CircleX size={13} aria-hidden />}
            {hit ? t("pred.hit") : t("pred.miss")}
          </span>
        )}
      </header>

      {showTopic && (
        <Link href={`/t/${topic.id}`} className="display-mid mt-4 block text-2xl hover:underline">
          {topic.title}
        </Link>
      )}

      {prediction.held ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Lock size={14} aria-hidden /> {t("topic.held")}
        </p>
      ) : hasContent ? (
        <>
          {(option || prediction.confidence != null) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              {option && <span className="rounded-full border-[1.5px] border-ink bg-card px-3.5 py-1.5 font-semibold">{option.label}</span>}
              {prediction.confidence != null && (
                <span className="text-muted">
                  {t("pred.conf", { n: prediction.confidence })}
                </span>
              )}
            </div>
          )}
          {prediction.body && <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed text-ink-2">{prediction.body}</p>}
          {noteKey && (
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-muted">
              <Lock size={12} aria-hidden /> {t(noteKey)}
            </p>
          )}
        </>
      ) : (
        <div className="mt-4 space-y-2" aria-hidden>
          {[90, 100, 70].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full bg-ink/15" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/20 pt-3">
        <HashPill hash={prediction.commitment} />
        <div className="flex flex-wrap items-center gap-4">
          {topic.revealed && hasContent && prediction.salt && !prediction.held && <VerifyButton prediction={prediction} />}
          {topic.revealed && !prediction.mine && <ReportButton topicId={topic.id} predictionId={prediction.id} />}
          <Link href={`/p/${prediction.id}`} className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4">
            {t("pred.open")} <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      </footer>
    </article>
  );
}
