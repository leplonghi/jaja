import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewEventForm } from "@/components/NewEventForm";
import { getCurrentUser } from "@/lib/data";
import { IS_DEMO } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Criar evento" };

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user && !IS_DEMO) redirect("/login?next=/eventos/novo");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Criar um evento</h1>
      <p className="mt-2 mb-8 text-muted">Uma pergunta sobre algo que ainda vai acontecer. Todo mundo lacra, ninguém vê, e você revela no fim.</p>
      {IS_DEMO && (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">Modo demonstração: você pode preencher, mas não publicar.</div>
      )}
      <NewEventForm />
    </div>
  );
}
