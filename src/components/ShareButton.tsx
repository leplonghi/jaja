"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/format";

/** Compartilhamento nativo no celular; copia o link no desktop. */
export function ShareButton({
  path,
  text,
  label,
  copiedLabel,
  primary = false,
  className,
}: {
  path: string;
  text: string;
  label: string;
  copiedLabel: string;
  primary?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* a pessoa cancelou o compartilhamento */
    }
  }

  return (
    <button type="button" onClick={share} className={cn("btn px-5 py-3.5 text-sm", primary ? "btn-signal" : "btn-line", className)}>
      {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
      {copied ? copiedLabel : label}
    </button>
  );
}
