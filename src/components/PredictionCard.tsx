import Link from "next/link";
import { CircleCheck, CircleX, ExternalLink } from "lucide-react";
import { cn, timeAgo } from "@/lib/format";
import type { EventWithMeta, Prediction, Profile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { VerifyButton } from "./VerifyButton";
import { HashPill } from "./ui";

/** Um palpite com conteúdo visível (autor, ou evento já revelado). */
export function PredictionCard({
  prediction,
  event,
  author,
  showEvent = false,
}: {
  prediction: Prediction;
  event: EventWithMeta;
  author?: Profile | null;
  showEvent?: boolean;
}) {
  const option = event.options.find((o) => o.id === prediction.option_id);
  const resolved = event.status === "resolved";
  const hit = resolved && prediction.option_id === event.winning_option_id;

  return (
    <article
      className={cn(
        "card p-5",
        resolved && (hit ? "border-good/30 bg-good/[0.04]" : "border-bad/25 bg-bad/[0.03]"),
      )}
    >
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
          <span className="text-xs text-muted">Lacrado {timeAgo(prediction.created_at)}</span>
        )}
        {resolved && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1",
              hit ? "bg-good/15 text-good ring-good/30" : "bg-bad/15 text-bad ring-bad/30",
            )}
          >
            {hit ? <CircleCheck size={13} aria-hidden /> : <CircleX size={13} aria-hidden />}
            {hit ? "Acertou" : "Errou"}
          </span>
        )}
      </header>

      {showEvent && (
        <Link href={`/eventos/${event.id}`} className="mt-4 block text-sm font-semibold leading-snug hover:text-gold">
          {event.title}
        </Link>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-lg bg-white/[0.07] px-3 py-1.5 font-semibold">{option?.label ?? "—"}</span>
        <span className="text-muted">
          com <b className="tabular-nums text-fg">{prediction.confidence}%</b> de confiança
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{prediction.thesis}</p>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <HashPill hash={prediction.commitment} />
        <div className="flex items-center gap-4">
          {resolved && <VerifyButton prediction={prediction} />}
          <Link href={`/p/${prediction.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg">
            Abrir <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      </footer>
    </article>
  );
}
