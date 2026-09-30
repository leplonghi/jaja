import Link from "next/link";
import { ArrowRight, EyeOff, Fingerprint, PenLine, ShieldCheck, Stamp, Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EventCard } from "@/components/EventCard";
import { HeroVault } from "@/components/HeroVault";
import { getLeaderboard, listEvents } from "@/lib/data";
import { IS_DEMO } from "@/lib/supabase/env";

const steps = [
  {
    Icon: PenLine,
    title: "Escreva sua previsão",
    body: "Escolha o resultado, explique seu raciocínio e diga o quanto você confia nele.",
  },
  {
    Icon: Stamp,
    title: "Lacre",
    body: "O servidor carimba a hora e gera um hash SHA-256. Só você lê o conteúdo — e ninguém edita, nem você.",
  },
  {
    Icon: EyeOff,
    title: "Revele depois",
    body: "Quando o evento acontece, todos os lacres abrem de uma vez, com prova de que nada mudou.",
  },
];

const faq = [
  {
    q: "Posso mudar meu palpite depois de lacrar?",
    a: "Não. É isso que dá valor à previsão: o banco de dados não permite edição nem exclusão de lacres.",
  },
  {
    q: "Outras pessoas conseguem ver o que escrevi antes da revelação?",
    a: "Não. O conteúdo é bloqueado pelo próprio banco de dados. Só aparecem o fato de que você lacrou e o hash.",
  },
  {
    q: "Como sei que ninguém alterou depois?",
    a: "O hash público é gerado no momento do lacre. Na revelação, o botão “Verificar lacre” recalcula o SHA-256 no seu navegador e compara.",
  },
  {
    q: "Quem decide o resultado de um evento?",
    a: "Quem criou o evento, depois do prazo. Por isso cada evento mostra o criador e recomenda citar uma fonte oficial na descrição.",
  },
  {
    q: "É aposta com dinheiro?",
    a: "Não. Não há dinheiro envolvido: o jogo é reputação, acertos e calibragem (Brier score).",
  },
];

export default async function Home() {
  const [open, waiting, board] = await Promise.all([
    listEvents({ tab: "abertos", limit: 3 }),
    listEvents({ tab: "aguardando", limit: 3 }),
    getLeaderboard(3),
  ]);
  const featured = open.length ? open : waiting;

  return (
    <div className="space-y-24">
      {IS_DEMO && (
        <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          <b>Modo demonstração.</b> Os dados abaixo são fictícios. Para ativar login e banco de dados, configure o Supabase (veja o
          README).
        </div>
      )}

      {/* HERO */}
      <section className="grid items-center gap-14 pt-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-muted">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-wax" />
              <span className="relative inline-flex size-2 rounded-full bg-wax" />
            </span>
            Eleições, jogos, lançamentos — tudo que ainda não aconteceu
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Preveja agora.
            <br />
            <span className="grad-text-shimmer">Revele depois.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted text-pretty">
            Diga com todas as letras o que vai acontecer, sem medo de errar em público e sem ninguém te copiar. O Lacre guarda sua
            previsão selada e, quando o evento acontece, prova que você falou primeiro.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/eventos" className="btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base">
              Lacrar meu palpite <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href="/eventos/novo" className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold">
              Criar um evento
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-faint">
            <ShieldCheck size={16} aria-hidden /> Login com Google, Apple ou e-mail · grátis · sem dinheiro envolvido
          </p>
        </div>
        <HeroVault />
      </section>

      {/* COMO FUNCIONA */}
      <section aria-labelledby="como">
        <h2 id="como" className="text-3xl font-bold tracking-tight sm:text-4xl">
          Três passos. Zero desculpa.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(({ Icon, title, body }, i) => (
            <div key={title} className="card p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-wax/25 to-gold/20 text-gold ring-1 ring-white/10">
                  <Icon size={22} aria-hidden />
                </span>
                <span className="font-mono text-sm text-faint">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EM ALTA */}
      <section aria-labelledby="alta">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="alta" className="text-3xl font-bold tracking-tight sm:text-4xl">
              Rolando agora
            </h2>
            <p className="mt-2 text-muted">Lacre antes que o prazo feche. Depois, só na sorte.</p>
          </div>
          <Link href="/eventos" className="hidden items-center gap-1 text-sm font-semibold text-gold hover:underline sm:inline-flex">
            Ver todos <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
        {featured.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="card mt-8 p-10 text-center text-muted">
            Ainda não há eventos abertos.{" "}
            <Link href="/eventos/novo" className="font-semibold text-gold hover:underline">
              Crie o primeiro
            </Link>
            .
          </div>
        )}
      </section>

      {/* PROVA */}
      <section aria-labelledby="prova" className="card overflow-hidden p-8 sm:p-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-iris">
              <Fingerprint size={18} aria-hidden /> Prova, não promessa
            </span>
            <h2 id="prova" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              O hash é o seu carimbo de “eu avisei”.
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              No instante do lacre, o servidor calcula um SHA-256 sobre o seu palpite e o publica. Se uma única vírgula mudar depois,
              o hash muda. Na revelação, qualquer pessoa recalcula e confere no próprio navegador.
            </p>
            <p className="mt-3 text-sm text-faint">
              Dica: compartilhe o link do seu lacre nas redes. O hash vira prova pública de que você falou antes.
            </p>
          </div>
          <div className="rounded-2xl bg-black/40 p-5 font-mono text-[13px] leading-7 ring-1 ring-white/10">
            <div className="text-faint">{"// como o compromisso é calculado"}</div>
            <div>
              <span className="text-iris">sha256</span>(
            </div>
            <div className="pl-4 text-muted">
              evento <span className="text-faint">|</span> autor <span className="text-faint">|</span> opção
            </div>
            <div className="pl-4 text-muted">
              <span className="text-faint">|</span> confiança <span className="text-faint">|</span> salt{" "}
              <span className="text-faint">|</span> <span className="text-gold">tese</span>
            </div>
            <div>)</div>
            <div className="mt-2 break-all text-good hash-glow">→ 7f3a9c1e5b2d40869fa1c37e5b2d4086…</div>
          </div>
        </div>
      </section>

      {/* RANKING */}
      {board.length > 0 && (
        <section aria-labelledby="rank">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="rank" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Quem realmente enxerga o futuro
              </h2>
              <p className="mt-2 text-muted">Acerto e calibragem (Brier score). Chutar 99% e errar custa caro.</p>
            </div>
            <Link href="/ranking" className="hidden items-center gap-1 text-sm font-semibold text-gold hover:underline sm:inline-flex">
              Ranking completo <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {board.slice(0, 3).map((r, i) => (
              <li key={r.user_id}>
                <Link href={`/u/${r.handle}`} className="card card-hover flex items-center gap-4 p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-white/5 text-lg font-bold">
                    {i === 0 ? <Trophy className="text-gold" size={20} aria-label="1º lugar" /> : i + 1}
                  </span>
                  <Avatar name={r.display_name} src={r.avatar_url} size={44} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{r.display_name}</div>
                    <div className="text-xs text-muted">
                      {r.accuracy.toFixed(0)}% de acerto · {r.total} palpites
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* FAQ */}
      <section aria-labelledby="faq" className="mx-auto max-w-3xl">
        <h2 id="faq" className="text-3xl font-bold tracking-tight sm:text-4xl">
          Perguntas frequentes
        </h2>
        <div className="mt-8 space-y-3">
          {faq.map(({ q, a }) => (
            <details key={q} className="card group px-5 py-4 open:bg-white/[0.05]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="text-xl text-muted transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="card relative overflow-hidden px-6 py-14 text-center sm:px-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-wax/15 via-transparent to-gold/10" />
        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
          Falar depois que aconteceu, todo mundo fala.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted">Seja quem avisou antes.</p>
        <Link href="/login" className="btn-primary mt-8 inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-base">
          Criar minha conta grátis <ArrowRight size={18} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
