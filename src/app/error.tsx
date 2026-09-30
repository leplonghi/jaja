"use client";

import { useI18n } from "@/i18n/client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center pt-16 text-center">
      <h1 className="display text-7xl">{t("err.title")}</h1>
      <p className="mt-4 text-muted">{t("err.body")}</p>
      <button onClick={reset} className="btn btn-signal mt-8 px-7 py-3.5 text-sm">
        {t("err.retry")}
      </button>
    </div>
  );
}
