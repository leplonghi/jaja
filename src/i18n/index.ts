import { en } from "./en";
import { es } from "./es";
import { pt, type Dict } from "./pt";

export const LOCALES = ["pt", "en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export type Key = keyof Dict;
export type Params = Record<string, string | number>;

export const DEFAULT_LOCALE: Locale = "pt";
export const LOCALE_COOKIE = "jaja-locale";
export const DICTS: Record<Locale, Dict> = { pt, en, es };

export const LOCALE_LABELS: Record<Locale, string> = { pt: "PT", en: "EN", es: "ES" };
export const HTML_LANG: Record<Locale, string> = { pt: "pt-BR", en: "en", es: "es" };

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** Primeiro idioma suportado do cabeçalho Accept-Language. */
export function matchLocale(header: string | null | undefined): Locale {
  for (const part of (header ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export function interpolate(template: string, params?: Params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

export type TFn = (key: Key, params?: Params) => string;
/** Plural simples: usa `${base}.one` para 1 e `${base}.other` para o resto. */
export type TpFn = (base: "count.seals" | "profile.pending", n: number, params?: Params) => string;

export function makeT(locale: Locale): { t: TFn; tp: TpFn } {
  const dict = DICTS[locale];
  const t: TFn = (key, params) => interpolate(dict[key] ?? DICTS[DEFAULT_LOCALE][key] ?? key, params);
  const tp: TpFn = (base, n, params) => t(`${base}.${n === 1 ? "one" : "other"}` as Key, { n, ...params });
  return { t, tp };
}
