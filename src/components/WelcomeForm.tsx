"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { completeOnboarding } from "@/app/actions";
import type { Key } from "@/i18n";
import { useI18n } from "@/i18n/client";

export function WelcomeForm({ next, age }: { next: string; age: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [pending, start] = useTransition();

  const row = "flex items-start gap-3 rounded-2xl border-[1.5px] border-ink bg-card p-4 text-sm leading-relaxed";
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await completeOnboarding(adult, terms);
          if (r.ok) router.push(next);
          else setError(r.error);
        });
      }}
    >
      <label className={row}>
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1 size-5 accent-[#ff4a1c]" />
        <span>{t("welcome.adult", { age })}</span>
      </label>
      <label className={row}>
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 size-5 accent-[#ff4a1c]" />
        <span>
          {t("welcome.terms")}{" "}
          <Link href="/terms" className="font-semibold underline underline-offset-4" target="_blank">
            {t("footer.terms")}
          </Link>
          {" · "}
          <Link href="/privacy" className="font-semibold underline underline-offset-4" target="_blank">
            {t("footer.privacy")}
          </Link>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-bad">
          {t(error)}
        </p>
      )}
      <button type="submit" disabled={!adult || !terms || pending} className="btn btn-signal w-full px-4 py-4 text-base">
        {pending && <Loader2 size={18} className="animate-spin" aria-hidden />} {t("welcome.cta")}
      </button>
    </form>
  );
}
