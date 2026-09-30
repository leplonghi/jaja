import { CATEGORIES, type CategoryId, type EventPhase } from "@/lib/types";
import { cn, shortHash } from "@/lib/format";
import { Fingerprint, Lock, LockOpen, Ban, Clock } from "lucide-react";

export function CategoryChip({ id, className }: { id: CategoryId; className?: string }) {
  const c = CATEGORIES.find((x) => x.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-muted", className)}>
      <span aria-hidden>{c.emoji}</span>
      {c.label}
    </span>
  );
}

export function HashPill({ hash, className }: { hash: string; className?: string }) {
  return (
    <span
      title={`SHA-256: ${hash}`}
      className={cn("inline-flex items-center gap-1.5 rounded-md bg-iris/10 px-2 py-1 font-mono text-[11px] text-iris ring-1 ring-iris/25", className)}
    >
      <Fingerprint size={12} aria-hidden />
      {shortHash(hash)}
    </span>
  );
}

const PHASE: Record<EventPhase, { label: string; cls: string; Icon: typeof Lock }> = {
  open: { label: "Aberto para lacrar", cls: "bg-good/10 text-good ring-good/25", Icon: LockOpen },
  locked: { label: "Lacres trancados", cls: "bg-gold/10 text-gold ring-gold/25", Icon: Clock },
  resolved: { label: "Revelado", cls: "bg-wax/10 text-wax ring-wax/25", Icon: Lock },
  canceled: { label: "Cancelado", cls: "bg-white/5 text-muted ring-white/15", Icon: Ban },
};

export function PhaseBadge({ phase, className }: { phase: EventPhase; className?: string }) {
  const { label, cls, Icon } = PHASE[phase];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", cls, className)}>
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="text-xs font-medium uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 text-3xl" aria-hidden>🔒</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
