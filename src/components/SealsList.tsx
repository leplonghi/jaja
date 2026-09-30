import Link from "next/link";
import { Lock } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { Seal } from "@/lib/types";
import { Avatar } from "./Avatar";
import { HashPill } from "./ui";

/** Lista pública de lacres ainda fechados: só quem, quando e o hash. */
export function SealsList({ seals, total, viewerId }: { seals: Seal[]; total: number; viewerId?: string }) {
  return (
    <section aria-labelledby="seals-title" className="card p-5">
      <h2 id="seals-title" className="flex items-center gap-2 text-lg font-semibold">
        <Lock size={17} className="text-gold" aria-hidden />
        {total.toLocaleString("pt-BR")} {total === 1 ? "lacre" : "lacres"}
      </h2>
      <p className="mt-1 text-xs text-muted">Todos trancados. O conteúdo só aparece quando o evento for resolvido.</p>

      {seals.length === 0 ? (
        <p className="mt-6 text-center text-sm text-faint">Ninguém lacrou ainda. Seja o primeiro a avisar.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {seals.slice(0, 30).map((s) => (
            <li key={s.id} className="flex items-center gap-3">
              <Avatar name={s.profile?.display_name ?? "?"} src={s.profile?.avatar_url} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {s.profile ? (
                    <Link href={`/u/${s.profile.handle}`} className="hover:text-gold">
                      {s.profile.display_name}
                    </Link>
                  ) : (
                    "Anônimo"
                  )}
                  {viewerId === s.user_id && <span className="ml-1.5 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold">você</span>}
                </div>
                <div className="text-xs text-faint">{timeAgo(s.created_at)}</div>
              </div>
              <HashPill hash={s.commitment} />
            </li>
          ))}
        </ul>
      )}
      {total > 30 && <p className="mt-4 text-center text-xs text-faint">e mais {(total - 30).toLocaleString("pt-BR")} lacres trancados…</p>}
    </section>
  );
}
