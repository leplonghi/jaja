import Link from "next/link";
import { Lock, Users } from "lucide-react";
import { formatDateTime, phaseOf } from "@/lib/format";
import type { EventWithMeta } from "@/lib/types";
import { Countdown } from "./Countdown";
import { CategoryChip, PhaseBadge } from "./ui";

export function EventCard({ event }: { event: EventWithMeta }) {
  const phase = phaseOf(event);
  return (
    <Link href={`/eventos/${event.id}`} className="card card-hover group flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <CategoryChip id={event.category} />
        <PhaseBadge phase={phase} />
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-snug tracking-tight text-balance group-hover:text-white">{event.title}</h3>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {event.options.map((o) => (
          <span key={o.id} className="rounded-md bg-white/[0.05] px-2 py-1 text-xs text-muted">
            {o.label}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-6 text-sm">
        <div className="flex items-center gap-1.5 text-muted">
          <Users size={15} aria-hidden />
          <span className="tabular-nums font-semibold text-fg">{event.seals.toLocaleString("pt-BR")}</span>
          <span>{event.seals === 1 ? "lacre" : "lacres"}</span>
        </div>
        {phase === "open" ? (
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-faint">Fecha em</div>
            <Countdown to={event.locks_at} className="font-mono text-sm font-semibold text-gold" />
          </div>
        ) : phase === "locked" ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-gold">
            <Lock size={13} aria-hidden /> Aguardando resultado
          </span>
        ) : (
          <span className="text-xs text-muted">{formatDateTime(event.resolved_at ?? event.locks_at)}</span>
        )}
      </div>
    </Link>
  );
}
