"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/format";

/** Web Share API no celular; copia o link no desktop. */
export function ShareButton({
  path,
  text,
  label = "Compartilhar",
  primary = false,
  className,
}: {
  path: string;
  text: string;
  label?: string;
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
      /* usuário cancelou o compartilhamento */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(primary ? "btn-primary" : "btn-ghost", "inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold", className)}
    >
      {copied ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
      {copied ? "Link copiado!" : label}
    </button>
  );
}
