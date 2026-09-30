import { cn } from "@/lib/format";

/** Marca: "jaja" em tipografia condensada, com um ponto laranja como sinal de "já já". */
export function Logo({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn("display inline-flex items-baseline", className)}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-label="jaja"
    >
      jaja
      <span aria-hidden className="ml-[0.06em] inline-block size-[0.22em] rounded-full bg-signal" />
    </span>
  );
}
