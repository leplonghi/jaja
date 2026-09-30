import { HTML_LANG, type Locale, type TFn } from "@/i18n";
import type { Topic, TopicPhase } from "./types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function topicPhase(t: Pick<Topic, "status" | "locks_at" | "revealed">, now = Date.now()): TopicPhase {
  if (t.status === "blocked") return "blocked";
  if (t.status === "pending_review") return "pending";
  if (t.status === "canceled") return "canceled";
  if (t.status === "resolved" || t.revealed) return "revealed";
  return new Date(t.locks_at).getTime() > now ? "open" : "waiting";
}

export function shortHash(hash: string) {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/** Datas em fuso de Brasília: o lançamento é no Brasil. */
export function formatDateTime(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(HTML_LANG[locale], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(iso))
    .replace(".", "");
}

export function timeAgo(iso: string, t: TFn, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return t("time.now");
  const m = Math.floor(s / 60);
  if (m < 60) return t("time.min", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("time.hour", { n: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("time.yesterday") : t("time.days", { n: d });
}

export function countdownParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

/** "2d 04h", "3h 12min", "45min 10s" */
export function compactCountdown(ms: number, t: TFn) {
  if (ms <= 0) return t("time.ended");
  const { d, h, m, s } = countdownParts(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${p(h)}h`;
  if (h > 0) return `${h}h ${p(m)}min`;
  return `${m}min ${p(s)}s`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Evita open redirect: só aceita caminhos internos. */
export function safeNext(next: string | null | undefined, fallback = "/vault") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function isChallenge(t: Pick<Topic, "kind" | "allow_join">) {
  return t.kind === "free" && t.allow_join;
}

/** Idade mínima por país. Brasil: padrão conservador de 18 até orientação jurídica. */
export function minAge() {
  const n = Number(process.env.MIN_AGE_BR ?? "18");
  return Number.isFinite(n) && n >= 0 ? n : 18;
}
