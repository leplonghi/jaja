import { Fingerprint } from "lucide-react";
import { cn, shortHash } from "@/lib/format";

export function Tag({ children, tone = "line", className }: { children: React.ReactNode; tone?: "line" | "ink" | "signal" | "ok" | "bad"; className?: string }) {
  const tones = {
    line: "border-ink/60 text-ink",
    ink: "border-ink bg-ink text-paper",
    signal: "border-ink bg-signal text-ink",
    ok: "border-ok text-ok",
    bad: "border-bad text-bad",
  } as const;
  return (
    <span className={cn("kicker inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", tones[tone], className)}>{children}</span>
  );
}

export function HashPill({ hash, className }: { hash: string; className?: string }) {
  return (
    <span
      title={`SHA-256: ${hash}`}
      className={cn("inline-flex items-center gap-1.5 rounded-md border border-ink/40 bg-paper-2 px-2 py-1 font-mono text-[11px]", className)}
    >
      <Fingerprint size={12} aria-hidden />
      {shortHash(hash)}
    </span>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="sheet px-4 py-3.5">
      <div className="kicker text-muted">{label}</div>
      <div className="display mt-2 text-5xl numeral">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="sheet flex flex-col items-center px-6 py-14 text-center">
      <div className="display text-6xl text-signal" aria-hidden>
        ?
      </div>
      <h3 className="display-mid mt-3 text-2xl">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{body}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
