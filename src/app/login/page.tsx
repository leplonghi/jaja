import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { getT } from "@/i18n/server";
import { getViewer } from "@/lib/data";
import { safeNext } from "@/lib/format";
import { IS_DEMO } from "@/lib/supabase/env";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.login") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const [{ next, error }, { t }, viewer] = await Promise.all([searchParams, getT(), getViewer()]);
  const target = safeNext(next);
  if (viewer) redirect(viewer.onboarded ? target : `/welcome?next=${encodeURIComponent(target)}`);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-6 sm:pt-12">
      <Logo size={64} />
      <h1 className="display mt-8 text-center text-6xl">{t("auth.title")}</h1>
      <p className="mt-3 text-center text-muted">{t("auth.sub")}</p>
      <div className="sheet mt-8 w-full p-6 sm:p-8">
        {error && (
          <p role="alert" className="mb-4 text-sm font-medium text-bad">
            {t("auth.err.generic")}
          </p>
        )}
        <AuthForm next={target} demo={IS_DEMO} />
      </div>
      <p className="kicker mt-6 text-center text-muted">{t("auth.small")}</p>
    </div>
  );
}
