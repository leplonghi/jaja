import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center pt-10 text-center">
      <div className="display text-[clamp(8rem,30vw,16rem)] text-signal [text-shadow:0.03em_0.03em_0_var(--color-ink)]">404</div>
      <h1 className="display-mid -mt-4 text-4xl">{t("nf.title")}</h1>
      <p className="mt-3 text-muted">{t("nf.body")}</p>
      <Link href="/" className="btn btn-signal mt-8 px-7 py-3.5 text-sm">
        {t("nf.cta")}
      </Link>
    </div>
  );
}
