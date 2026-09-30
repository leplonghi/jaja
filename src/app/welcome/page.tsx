import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WelcomeForm } from "@/components/WelcomeForm";
import { getT } from "@/i18n/server";
import { getViewer } from "@/lib/data";
import { minAge, safeNext } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("welcome.title") };
}

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, { t }, viewer] = await Promise.all([searchParams, getT(), getViewer()]);
  const target = safeNext(next, "/new");
  if (!viewer) redirect(`/login?next=${encodeURIComponent("/welcome")}`);
  if (viewer.onboarded) redirect(target);

  return (
    <div className="mx-auto max-w-lg pt-6 sm:pt-12">
      <h1 className="display text-6xl sm:text-7xl">{t("welcome.title")}</h1>
      <p className="mt-4 mb-8 text-muted">{t("welcome.sub")}</p>
      <WelcomeForm next={target} age={minAge()} initialHandle={viewer.handle} initialName={viewer.display_name} />
    </div>
  );
}
