import type { Metadata } from "next";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("terms.title") };
}

export default async function TermsPage() {
  const { t } = await getT();
  return (
    <article className="mx-auto max-w-2xl">
      <p className="sheet bg-signal/25 p-4 text-sm font-semibold">{t("legal.draft")}</p>
      <h1 className="display mt-8 text-7xl">{t("terms.title")}</h1>
      <ol className="mt-8 list-decimal space-y-4 pl-6 text-lg leading-relaxed text-ink-2">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <li key={n}>{t(`terms.${n}`)}</li>
        ))}
      </ol>
    </article>
  );
}
