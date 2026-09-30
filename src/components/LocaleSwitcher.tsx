"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions";
import { LOCALES, LOCALE_LABELS } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/format";

export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("footer.lang")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={l === locale}
          onClick={() =>
            start(async () => {
              await setLocale(l);
              router.refresh();
            })
          }
          className={cn(
            "kicker rounded-full border px-2.5 py-1 transition",
            l === locale ? "border-ink bg-ink text-paper" : "border-transparent text-muted hover:border-ink/40 hover:text-ink",
          )}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
