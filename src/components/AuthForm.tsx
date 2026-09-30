"use client";

import { useState } from "react";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "apple";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export function AuthForm({ next, demo }: { next: string; demo: boolean }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<Provider | "email" | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function oauth(provider: Provider) {
    setError(null);
    setBusy(provider);
    const { error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } });
    if (error) {
      setError(t("auth.err.provider", { provider: provider === "apple" ? "Apple" : "Google" }));
      setBusy(null);
    }
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy("email");
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
    setBusy(null);
    if (error) setError(t("auth.err.mail"));
    else setSent(true);
  }

  if (demo) {
    return <div className="rounded-2xl border-[1.5px] border-ink bg-signal/20 p-4 text-sm font-medium">{t("auth.demo")}</div>;
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="grid size-14 place-items-center rounded-full border-[1.5px] border-ink bg-signal">
          <MailCheck size={28} aria-hidden />
        </span>
        <h2 className="display-mid text-2xl">{t("auth.sent.t")}</h2>
        <p className="max-w-xs text-sm text-muted">{t("auth.sent.b", { email })}</p>
        <button onClick={() => setSent(false)} className="text-sm font-medium underline underline-offset-4">
          {t("auth.other")}
        </button>
      </div>
    );
  }

  const disabled = busy !== null;
  return (
    <div className="space-y-3">
      <button onClick={() => oauth("google")} disabled={disabled} className="btn btn-line w-full gap-3 px-4 py-4 text-sm">
        {busy === "google" ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
        {t("auth.google")}
      </button>
      <button onClick={() => oauth("apple")} disabled={disabled} className="btn btn-ink w-full gap-3 px-4 py-4 text-sm">
        {busy === "apple" ? <Loader2 size={18} className="animate-spin" /> : <AppleIcon />}
        {t("auth.apple")}
      </button>

      <div className="kicker flex items-center gap-3 py-2 text-muted">
        <span className="h-px flex-1 bg-ink/20" /> {t("auth.or")} <span className="h-px flex-1 bg-ink/20" />
      </div>

      <form onSubmit={magicLink} className="space-y-3">
        <label htmlFor="email" className="sr-only">
          {t("auth.email")}
        </label>
        <div className="relative">
          <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field pl-11"
          />
        </div>
        <button type="submit" disabled={disabled || !email} className="btn btn-signal w-full px-4 py-4 text-sm">
          {busy === "email" && <Loader2 size={18} className="animate-spin" />}
          {t("auth.email.cta")}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm font-medium text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
