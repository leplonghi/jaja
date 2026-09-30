import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PredictionCard } from "@/components/PredictionCard";
import { StatsRow } from "@/components/StatsRow";
import { getT } from "@/i18n/server";
import { getProfileByHandle, getProfileHistory, getViewer } from "@/lib/data";
import { computeStats } from "@/lib/stats";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const p = await getProfileByHandle(handle);
  return { title: p ? `${p.display_name} (@${p.handle})` : "jaja" };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const [{ t, tp }, { items, pending }, viewer] = await Promise.all([getT(), getProfileHistory(profile), getViewer()]);
  const stats = computeStats(items);

  return (
    <div className="space-y-10">
      <header className="flex items-center gap-5">
        <Avatar name={profile.display_name} src={profile.avatar_url} size={88} />
        <div className="min-w-0">
          <h1 className="display truncate text-6xl sm:text-8xl">{profile.display_name}</h1>
          <p className="mt-1 text-muted">@{profile.handle}</p>
          {viewer?.id === profile.id && (
            <form action="/auth/signout" method="post" className="mt-3 md:hidden">
              <button type="submit" className="btn btn-line px-4 py-2 text-xs">
                {t("nav.logout")}
              </button>
            </form>
          )}
        </div>
      </header>

      <StatsRow stats={stats} pending={pending} />

      {pending > 0 && (
        <div className="sheet flex items-center gap-3 px-5 py-4 text-sm">
          <Lock size={18} className="shrink-0" aria-hidden />
          <span>{tp("profile.pending", pending, { name: profile.display_name })}</span>
        </div>
      )}

      <section aria-labelledby="hist">
        <h2 id="hist" className="display text-5xl sm:text-6xl">
          {t("profile.revealed")}
        </h2>
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{t("profile.none")}</p>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {items.map(({ prediction, topic }) => (
              <PredictionCard key={prediction.id} prediction={prediction} topic={topic} showTopic />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
