import Link from "next/link";
import { ArrowRight, Plus, Swords } from "lucide-react";
import { BigCountdown } from "@/components/Countdown";
import { DailyCard } from "@/components/DailyCard";
import { TopicCard } from "@/components/TopicCard";
import { getT } from "@/i18n/server";
import { getViewer, listTopics } from "@/lib/data";
import { pickDaily } from "@/lib/daily";
import { IS_DEMO } from "@/lib/supabase/env";

export default async function Home() {
  const [{ t }, viewer, open, revealed] = await Promise.all([
    getT(),
    getViewer(),
    listTopics({ tab: "open", limit: 7 }),
    listTopics({ tab: "revealed", limit: 3 }),
  ]);

  const next = open[0];
  const daily = pickDaily(open);
  const grid = open.filter((x) => x.id !== daily?.id).slice(0, 6);

  const faq = [1, 2, 3, 4, 5] as const;

  return (
    <div className="space-y-20 sm:space-y-28">
      {IS_DEMO && <div className="rounded-2xl border-[1.5px] border-ink bg-signal/25 px-4 py-3 text-sm font-medium">{t("common.demo")}</div>}

      {/* HERO */}
      <section aria-labelledby="h1" className="-mt-2">
        <h1 id="h1" className="display text-[clamp(3.6rem,13.5vw,10.5rem)]">
          {t("brand.tagline").split(". ")[0]}.
          <br />
          <span className="text-signal [text-shadow:0.035em_0.035em_0_var(--color-ink)]">{t("brand.tagline").split(". ")[1]}</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2 text-pretty sm:text-xl">{t("brand.desc")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/new" className="btn btn-signal px-7 py-4 text-base">
            {t("home.cta1")} <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href="/explore" className="btn btn-line px-7 py-4 text-base">
            {t("home.cta2")}
          </Link>
        </div>
        <p className="kicker mt-5 text-muted">{t("home.trust")}</p>
      </section>

      {/* CONTAGEM */}
      <section aria-label={t("home.nextLabel")} className="ink-block -mx-4 overflow-hidden px-4 py-10 sm:mx-0 sm:rounded-[2rem] sm:px-10 sm:py-14">
        <div className="kicker flex items-center gap-2 text-paper/70">
          <span className="inline-block size-2 animate-blink rounded-full bg-signal" />
          {t("home.nextLabel")}
        </div>
        {next ? (
          <>
            <Link href={`/t/${next.id}`} className="display-mid mt-4 block max-w-3xl text-2xl text-balance hover:underline sm:text-4xl">
              {next.title}
            </Link>
            <BigCountdown to={next.locks_at} className="mt-8 text-[clamp(3.4rem,15.5vw,11.5rem)]" />
            <Link href={`/t/${next.id}`} className="btn btn-signal mt-10 px-7 py-4 text-base">
              {t("home.nextGo")} <ArrowRight size={18} aria-hidden />
            </Link>
          </>
        ) : (
          <>
            <p className="display-mid mt-4 text-3xl">{t("home.nextEmpty")}</p>
            <Link href="/new" className="btn btn-signal mt-8 px-7 py-4 text-base">
              <Plus size={18} aria-hidden /> {t("home.cta1")}
            </Link>
          </>
        )}
      </section>

      {/* PALPITE DO DIA + DESAFIO */}
      <section className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {daily && <DailyCard topic={daily} loggedIn={!!viewer || IS_DEMO} onboarded={viewer?.onboarded ?? IS_DEMO} />}
        <div className="sheet ink-block flex flex-col p-6">
          <span className="kicker flex items-center gap-2 text-signal">
            <Swords size={15} aria-hidden /> {t("home.challengeKicker")}
          </span>
          <h2 className="display mt-4 text-5xl sm:text-6xl">{t("home.challengeTitle")}</h2>
          <p className="mt-4 text-paper/80">{t("home.challengeBody")}</p>
          <Link href="/new?type=challenge" className="btn btn-signal mt-auto self-start px-6 py-3.5 text-sm">
            {t("home.challengeCta")} <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section aria-labelledby="how">
        <h2 id="how" className="display text-6xl sm:text-8xl">
          {t("how.title")}
        </h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <li key={n} className="sheet p-6">
              <div className="display text-[7rem] leading-[0.8] text-signal [text-shadow:0.04em_0.04em_0_var(--color-ink)]" aria-hidden>
                {n}
              </div>
              <h3 className="display-mid mt-5 text-3xl">{t(`how.${n}.t`)}</h3>
              <p className="mt-2 text-ink-2">{t(`how.${n}.b`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ROLANDO AGORA */}
      <section aria-labelledby="now">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="now" className="display text-6xl sm:text-8xl">
              {t("home.nowTitle")}
            </h2>
            <p className="mt-3 text-ink-2">{t("home.nowSub")}</p>
          </div>
          <Link href="/explore" className="btn btn-line px-5 py-3 text-sm">
            {t("home.all")} <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
        {grid.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {grid.map((x) => (
              <TopicCard key={x.id} topic={x} />
            ))}
          </div>
        ) : (
          <p className="sheet mt-8 p-8 text-center text-muted">{t("home.noEvents")}</p>
        )}
      </section>

      {/* REVELADAS */}
      {revealed.length > 0 && (
        <section aria-labelledby="rev">
          <h2 id="rev" className="display text-6xl sm:text-8xl">
            {t("home.revealedTitle")}
          </h2>
          <p className="mt-3 text-ink-2">{t("home.revealedSub")}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {revealed.map((x) => (
              <TopicCard key={x.id} topic={x} />
            ))}
          </div>
        </section>
      )}

      {/* PROVA */}
      <section aria-labelledby="proof" className="ink-block -mx-4 px-4 py-14 sm:mx-0 sm:rounded-[2rem] sm:px-10 sm:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="kicker text-signal">{t("proof.kicker")}</span>
            <h2 id="proof" className="display mt-4 text-5xl sm:text-7xl">
              {t("proof.title")}
            </h2>
            <p className="mt-6 leading-relaxed text-paper/80">{t("proof.body")}</p>
            <p className="mt-3 text-sm text-paper/60">{t("proof.note")}</p>
          </div>
          <div className="rounded-2xl border border-paper/25 p-5 font-mono text-[13px] leading-7">
            <div className="text-paper/50">{"// sha256("}</div>
            <div className="pl-4">topic_id <span className="text-paper/40">|</span> user_id <span className="text-paper/40">|</span> option_id</div>
            <div className="pl-4">
              <span className="text-paper/40">|</span> confidence <span className="text-paper/40">|</span> salt <span className="text-paper/40">|</span>{" "}
              <span className="text-signal">body</span>
            </div>
            <div className="text-paper/50">{"// )"}</div>
            <div className="mt-2 break-all text-signal">→ 7f3a9c1e5b2d40869fa1c37e5b2d4086…</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq" className="mx-auto max-w-3xl">
        <h2 id="faq" className="display text-6xl sm:text-7xl">
          {t("faq.title")}
        </h2>
        <div className="mt-8 space-y-3">
          {faq.map((n) => (
            <details key={n} className="sheet group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {t(`faq.${n}.q`)}
                <span className="display text-3xl transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{t(`faq.${n}.a`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="text-center">
        <h2 className="display mx-auto max-w-4xl text-[clamp(2.8rem,9vw,7rem)] text-balance">{t("home.finalTitle")}</h2>
        <p className="mt-4 text-lg text-ink-2">{t("home.finalBody")}</p>
        <Link href={viewer ? "/new" : "/login"} className="btn btn-signal mt-8 px-8 py-4 text-base">
          {viewer ? t("home.cta1") : t("home.finalCta")} <ArrowRight size={18} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
