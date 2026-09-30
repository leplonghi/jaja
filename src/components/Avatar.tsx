import Image from "next/image";
import { cn, initials } from "@/lib/format";

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        unoptimized
        referrerPolicy="no-referrer"
        className={cn("rounded-full border-[1.5px] border-ink object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={name}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-signal font-bold text-ink", className)}
    >
      {initials(name)}
    </span>
  );
}
