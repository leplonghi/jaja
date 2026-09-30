import Image from "next/image";
import { cn, initials } from "@/lib/format";

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        unoptimized
        referrerPolicy="no-referrer"
        className={cn("rounded-full object-cover ring-1 ring-white/15", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={name}
      style={style}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-iris/70 to-wax/70 font-semibold text-white ring-1 ring-white/15",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
