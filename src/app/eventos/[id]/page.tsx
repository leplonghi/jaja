import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Lock, Trophy, UserRound } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { PredictionCard } from "@/components/PredictionCard";
import { ResolvePanel } from "@/components/ResolvePanel";
import { SealForm } from "@/components/SealForm";
import { SealsList } from "@/components/SealsList";
import { ShareButton } from "@/components/ShareButton";
import { CategoryChip, PhaseBadge } from "@/components/ui";
import { getCurrentUser, getEvent, getSeals } from "@/lib/data";
import { formatDateTime, phaseOf } from "@/lib/format";
import { IS_DEMO } from "@/lib/supabase/env";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: "Evento não encontrado" };
  return {
    title: event.title,
    description: `${event.seals} pessoas já lacraram um palpite. Lacre o seu antes do prazo.`,
  };
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const [user, seals] = await Promise.all([getCurrentUser(), getSeals(id)]);
  const phase = phaseOf(event);
  const mine = user ? seals.find((s) => s.user_id === user.id) : undefined;
  const isCreator = !!user && user.id === event.creator_id;
  const winner = event.options.find((o) => o.id === event.winning_option_id);

  const revealed = seals
    .filter((s) => s.prediction)
    .sort((a, b) => {
      const hitA = a.prediction!.option_id === event.winning_option_id ? 1 : 0;
      const hitB = b.prediction!.option_id === event.winning_option_id ? 1 : 0;
      return hitB - hitA || b.prediction!.confidence - a.prediction!.confidence;
    });
  const hits = revealed.filter((s) => s.prediction!.option_id === event.winning_option_id).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip id={event.category} />
            <PhaseBadge phase={phase} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">{event.title}</h1>
          {event.description && <p className="mt-3 max-w-2xl leading-relaxed text-muted">{event.description}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
            {event.creator && (
              <Link href={`/u/${event.creator.handle}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                <UserRound size={15} aria-hidden /> por <b className="text-fg">@{event.creator.handle}</b>
              </Link>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={15} aria-hidden /> Prazo: {formatDateTime(event.locks_at)}
            </span>
            {phase === "open" && (
              <span className="inline-flex items-center gap-1.5 text-gold">
                <Lock size={15} aria-hidden /> Fecha em <Countdown to={event.locks_at} className="font-mono font-semibold" />
              </span>
            )}
          </div>
        </header>

        {/* RESOLVIDO */}
        {phase === "resolved" && winner && (
          <div className="card overflow-hidden border-wax/30 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-wax">
              <Trophy size={16} aria-hidden /> Resultado oficial
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight">{winner.label}</div>
            <p className="mt-2 text-sm text-muted">
              {revealed.length > 0
                ? `${hits} de ${revealed.length} ${revealed.length === 1 ? "lacre acertou" : "lacres acertaram"} (${Math.round((hits / revealed.length) * 100)}%).`
                : "Ninguém lacrou este evento."}
            </p>
          </div>
        )}

        {phase === "canceled" && (
          <div className="card p-6 text-sm text-muted">Este evento foi cancelado pelo criador. Nenhum lacre foi revelado e ninguém pontuou.</div>
        )}

        {phase === "locked" && (
          <div className="card flex items-start gap-3 border-gold/30 p-5 text-sm">
            <Lock size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
            <p className="text-muted">
              <b className="text-fg">Prazo encerrado.</b> Os lacres estão trancados. Assim que o criador informar o resultado, tudo será
              revelado de uma vez.
            </p>
          </div>
        )}

        {/* Meu lacre */}
        {mine?.prediction && phase !== "resolved" && (
          <section aria-labelledby="mine">
            <h2 id="mine" className="mb-3 flex flex-wrap items-center gap-2 text-lg font-semibold">
              Seu lacre
              <span className="rounded-full bg-iris/10 px-2.5 py-1 text-xs font-medium text-iris ring-1 ring-iris/25">só você vê isso</span>
            </h2>
            <PredictionCard prediction={mine.prediction} event={event} />
            <div className="mt-3">
              <ShareButton
                path={`/p/${mine.id}`}
                text={`Lacrei meu palpite sobre “${event.title}”. Só revelo depois que acontecer. 🔒`}
                label="Compartilhar minha prova"
              />
            </div>
          </section>
        )}

        {/* Formulário */}
        {phase === "open" && !mine && (
          <section aria-labelledby="form-title">
            <h2 id="form-title" className="mb-3 text-lg font-semibold">
              Lacre seu palpite
            </h2>
            <SealForm eventId={event.id} eventTitle={event.title} options={event.options} loggedIn={!!user || IS_DEMO} />
          </section>
        )}

        {isCreator && (phase === "open" || phase === "locked") && (
          <ResolvePanel eventId={event.id} options={event.options} canResolve={phase === "locked"} />
        )}

        {/* Revelados */}
        {phase === "resolved" && (
          <section aria-labelledby="reveals">
            <h2 id="reveals" className="mb-4 text-xl font-bold">
              Todos os palpites revelados
            </h2>
            {revealed.length === 0 ? (
              <p className="text-sm text-muted">Nenhum palpite para revelar.</p>
            ) : (
              <div className="space-y-4">
                {revealed.map((s) => (
                  <PredictionCard key={s.id} prediction={s.prediction!} event={event} author={s.profile} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
        {phase !== "resolved" && <SealsList seals={seals} total={event.seals} viewerId={user?.id} />}
        {phase === "resolved" && (
          <div className="card p-5 text-sm text-muted">
            <b className="text-fg">Como conferir?</b> Cada palpite tem um botão “Verificar lacre”. Ele recalcula o SHA-256 no seu navegador e compara com o hash publicado quando o
            palpite foi lacrado.
          </div>
        )}
        <ShareButton
          path={`/eventos/${event.id}`}
          text={`Já lacrou seu palpite? “${event.title}”`}
          label="Convidar amigos para lacrar"
          className="w-full justify-center"
        />
      </aside>
    </div>
  );
}
