"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type Locale, type TFn, type TpFn } from "./index";

const Ctx = createContext<{ locale: Locale; t: TFn; tp: TpFn } | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, ...makeT(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n fora do I18nProvider");
  return v;
}
