import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { SealMark } from "@/components/Logo";
import { getCurrentUser } from "@/lib/data";
import { safeNext } from "@/lib/format";
import { IS_DEMO } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const target = safeNext(next);
  if (await getCurrentUser()) redirect(target);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-6 sm:pt-12">
      <SealMark size={64} className="drop-shadow-[0_10px_30px_rgba(255,79,109,0.5)]" />
      <h1 className="mt-6 text-center text-3xl font-extrabold tracking-tight">Entre para lacrar</h1>
      <p className="mt-2 text-center text-sm text-muted">Leva 10 segundos. Seu primeiro palpite lacrado já pode ser hoje.</p>

      <div className="card mt-8 w-full p-6 sm:p-8">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
            O login não foi concluído. Tente novamente.
          </p>
        )}
        <AuthForm next={target} demo={IS_DEMO} />
      </div>
      <p className="mt-6 max-w-xs text-center text-xs text-faint">
        Ao entrar você concorda em usar o Lacre com respeito. Não pedimos senha nem dados de pagamento.
      </p>
    </div>
  );
}
