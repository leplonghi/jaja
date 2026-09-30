import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Navbar } from "@/components/Navbar";
import { APP_NAME } from "@/components/Logo";
import { siteUrl } from "@/lib/format";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${APP_NAME} — preveja agora, revele depois`, template: `%s · ${APP_NAME}` },
  description:
    "Lacre guarda seu palpite com um selo criptográfico. Ninguém vê, ninguém edita — e quando o evento acontece, a prova aparece.",
  openGraph: { type: "website", locale: "pt_BR", siteName: APP_NAME },
  twitter: { card: "summary_large_image" },
};

// A barra de navegação depende do usuário logado: nada aqui pode ser estático.
export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#08070c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:px-6 md:pb-20">{children}</main>
        <footer className="border-t border-line py-10 pb-28 text-center text-sm text-faint md:pb-10">
          <p>
            {APP_NAME} · palpites lacrados com SHA-256. Entretenimento e reputação — não é casa de apostas e não movimenta dinheiro.
          </p>
        </footer>
      </body>
    </html>
  );
}
