import Link from "next/link";
import { Lock } from "lucide-react";
import { getT } from "@/i18n/server";
import { timeAgo } from "@/lib/format";
import type { Prediction } from "@/lib/types";
import { Avatar } from "./Avatar";
import { LiveCount } from "./LiveCount";
import { HashPill } from "./ui";

/** Quem já guardou uma previsão (sem conteúdo): nome, hora e código. */
export async function SealsList({ topicId, predictions, total }: { topicId: string; predictions: Prediction[]; total: number }) {
  const { t } = await getT();
  return (
    <section aria-labelledby="seals-title" className="sheet p-5">
      <h2 id="seals-title" className="display-mid flex items-center gap-2 text-2xl">
        <Lock size={18} aria-hidden />
        <LiveCount topicId={topicId} initial={total} />
      </h2>
      <p className="mt-1 text-xs text-muted">{t("topic.sealsNote")}</p>

      {predictions.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted">{t("topic.noSeals")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {predictions.slice(0, 30).map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Avatar name={p.display_name ?? "?"} src={p.avatar_url} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {p.handle ? (
                    <Link href={`/u/${p.handle}`} className="hover:underline">
                      {p.display_name}
                    </Link>
                  ) : (
                    "·"
                  )}
                  {p.mine && <span className="kicker ml-2 rounded-full bg-signal px-1.5 py-0.5 text-ink">{t("common.you")}</span>}
                </div>
                <div className="text-xs text-muted">{timeAgo(p.created_at, t)}</div>
              </div>
              <HashPill hash={p.commitment} />
            </li>
          ))}
        </ul>
      )}
      {total > 30 && <p className="mt-4 text-center text-xs text-muted">{t("common.more", { n: (total - 30).toLocaleString() })}</p>}
    </section>
  );
}
