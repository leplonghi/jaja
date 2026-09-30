import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { PredictionCard } from "@/components/PredictionCard";
import { StatsRow } from "@/components/StatsRow";
import { getCurrentUser, getProfileByHandle, getPublicHistory } from "@/lib/data";
import { computeStats } from "@/lib/stats";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const p = await getProfileByHandle(handle);
  return { title: p ? `${p.display_name} (@${p.handle})` : "Perfil não encontrado" };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const [viewer, { items, pending }] = await Promise.all([getCurrentUser(), getPublicHistory(profile)]);
  const stats = computeStats(items);

  return (
    <div className="space-y-10">
      <header className="flex items-center gap-5">
        <Avatar name={profile.display_name} src={profile.avatar_url} size={80} />
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-extrabold tracking-tight">{profile.display_name}</h1>
          <p className="text-muted">@{profile.handle}</p>
        </div>
      </header>

      <StatsRow stats={stats} pending={pending} />

      {pending > 0 && (
        <div className="card flex items-center gap-3 px-5 py-4 text-sm text-muted">
          <Lock size={18} className="shrink-0 text-gold" aria-hidden />
          <span>
            {viewer?.id === profile.id ? "Você tem" : `@${profile.handle} tem`} <b className="text-fg">{pending}</b> {pending === 1 ? "palpite lacrado" : "palpites lacrados"}{" "}
            aguardando revelação. Só depois do resultado dá para ler.
          </span>
        </div>
      )}

      <section aria-labelledby="hist">
        <h2 id="hist" className="mb-4 text-xl font-bold">
          Palpites revelados
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Nada revelado ainda. As previsões aparecem aqui quando os eventos forem resolvidos.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map(({ prediction, event }) => (
              <PredictionCard key={prediction.id} prediction={prediction} event={event} showEvent />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
