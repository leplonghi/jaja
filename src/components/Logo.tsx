import { cn } from "@/lib/format";

export const APP_NAME = "Lacre";

/** Selo de cera com um "L" em relevo. */
export function SealMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id="wax" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ff8a7a" />
          <stop offset="55%" stopColor="#ff4f6d" />
          <stop offset="100%" stopColor="#b8203f" />
        </radialGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd98a" />
          <stop offset="100%" stopColor="#ff4f6d" />
        </linearGradient>
      </defs>
      <path
        d="M32 3c5 0 7 4 12 4s9 3 9 8 5 8 5 13-3 8-4 12-1 9-6 11-8 1-12 4-8 6-12 4-8-4-11-8-7-6-7-11 3-8 3-12-4-9-1-14 8-4 11-7 7-4 13-4Z"
        fill="url(#wax)"
      />
      <circle cx="32" cy="33" r="17" fill="none" stroke="url(#rim)" strokeOpacity=".75" strokeWidth="1.6" />
      <path d="M26 22v18h13" fill="none" stroke="#fff3e6" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" opacity=".92" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <SealMark size={30} />
      <span className="text-lg">{APP_NAME}</span>
    </span>
  );
}
