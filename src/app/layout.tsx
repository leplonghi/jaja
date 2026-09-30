import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Link from "next/link";
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Logo } from "@/components/Logo";
import { Navbar } from "@/components/Navbar";
import { Ticker } from "@/components/Ticker";
import { HTML_LANG } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import { getT } from "@/i18n/server";
import { siteUrl } from "@/lib/format";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `jaja — ${t("brand.tagline")}`, template: "%s · jaja" },
    description: t("brand.desc"),
    openGraph: { type: "website", siteName: "jaja" },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = { themeColor: "#f3eee4", width: "device-width", initialScale: 1 };

// A barra de navegação depende do usuário logado: nada aqui pode ser estático.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getT();
  return (
    <html lang={HTML_LANG[locale]} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <I18nProvider locale={locale}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
            {t("nav.skip")}
          </a>
          <Ticker />
          <Navbar />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:px-6 md:pb-20">
            {children}
          </main>
          <footer className="border-t-[1.5px] border-ink pb-28 pt-10 md:pb-10">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-md">
                <Logo size={40} />
                <p className="mt-3 text-sm text-muted">{t("footer.note")}</p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <LocaleSwitcher />
                <nav className="flex gap-4 text-sm font-medium">
                  <Link href="/terms" className="underline underline-offset-4">
                    {t("footer.terms")}
                  </Link>
                  <Link href="/privacy" className="underline underline-offset-4">
                    {t("footer.privacy")}
                  </Link>
                </nav>
              </div>
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
