import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Lock } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Countdown } from "@/components/Countdown";
import { SealMark } from "@/components/Logo";
import { PredictionCard } from "@/components/PredictionCard";
import { ShareButton } from "@/components/ShareButton";
import { HashPill } from "@/components/ui";
import { getCurrentUser, getSeal } from "@/lib/data";
import { formatDateTime, phaseOf, timeAgo } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const found = await getSeal(id);
  if (!found) return { title: "Lacre não encontrado" };
  const who = found.seal.profile?.display_name ?? "Alguém";
  return {
    title: `${who} lacrou um palpite`,
    description: `“${found.event.title}” — palpite lacrado com SHA-256. Revelação quando o evento for resolvido.`,
  };
}

/** Página pública de um lacre: prova de que a pessoa falou antes. */
export default async function SealPage({ params }: Props) {
  const { id } = await params;
  const found = await getSeal(id);
  if (!found) notFound();
  const { seal, event } = found;

  const viewer = await getCurrentUser();
  const phase = phaseOf(event);
  const isOwner = viewer?.id === seal.user_id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card relative overflow-hidden p-6 text-center sm:p-10">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-wax/15 via-transparent to-transparent" />
        <SealMark size={84} className="mx-auto drop-shadow-[0_12px_34px_rgba(255,79,109,0.55)]" />
        <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-gold">
          {phase === "resolved" ? "Palpite revelado" : "Palpite lacrado"}
        </p>
        <h1 className="mt-3 text-2xl font-extrabold leading-snug tracking-tight text-balance sm:text-3xl">{event.title}</h1>

        {seal.profile && (
          <Link href={`/u/${seal.profile.handle}`} className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-line bg-white/[0.04] py-1.5 pl-1.5 pr-4 text-sm hover:bg-white/[0.08]">
            <Avatar name={seal.profile.display_name} src={seal.profile.avatar_url} size={28} />
            <span>
              <b>{seal.profile.display_name}</b> <span className="text-muted">lacrou {timeAgo(seal.created_at)}</span>
            </span>
          </Link>
        )}

        <div className="mt-5 flex justify-center">
          <HashPill hash={seal.commitment} />
        </div>
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-faint">
          Hash SHA-256 gerado no momento do lacre. Se qualquer detalhe do palpite mudar depois, o hash não vai bater na revelação.
        </p>
      </div>

      {phase === "resolved" && seal.prediction && <PredictionCard prediction={seal.prediction} event={event} author={seal.profile} />}

      {phase !== "resolved" && (
        <div className="card flex items-start gap-3 p-5 text-sm">
          <Lock size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
          <div className="text-muted">
            <p>
              <b className="text-fg">O conteúdo está trancado.</b> Ele será revelado para todo mundo quando o evento for resolvido.
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={14} aria-hidden /> Prazo: {formatDateTime(event.locks_at)}
              </span>
              {phase === "open" && (
                <span>
                  fecha em <Countdown to={event.locks_at} className="font-mono font-semibold text-gold" />
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {isOwner && seal.prediction && phase !== "resolved" && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted">Só você vê isto:</h2>
          <PredictionCard prediction={seal.prediction} event={event} />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {isOwner && (
          <ShareButton path={`/p/${seal.id}`} text={`Lacrei meu palpite sobre “${event.title}”. Só revelo depois que acontecer. 🔒`} label="Compartilhar minha prova" primary />
        )}
        {phase === "open" ? (
          <Link href={`/eventos/${event.id}`} className={isOwner ? "btn-ghost rounded-xl px-5 py-3 text-sm font-semibold" : "btn-primary rounded-xl px-6 py-3.5 text-sm"}>
            {isOwner ? "Ver evento" : "Lacrar o meu palpite"}
          </Link>
        ) : (
          <Link href={`/eventos/${event.id}`} className="btn-ghost rounded-xl px-5 py-3 text-sm font-semibold">
            Ver o evento
          </Link>
        )}
      </div>
    </div>
  );
}
