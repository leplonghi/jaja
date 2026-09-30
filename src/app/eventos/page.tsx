import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui";
import { listEvents, type EventTab } from "@/lib/data";
import { cn } from "@/lib/format";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Explorar eventos" };

const TABS: { id: EventTab; label: string }[] = [
  { id: "abertos", label: "Abertos" },
  { id: "aguardando", label: "Aguardando resultado" },
  { id: "revelados", label: "Revelados" },
];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ aba?: string; cat?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.id === sp.aba)?.id ?? "abertos") as EventTab;
  const cat = CATEGORIES.find((c) => c.id === sp.cat)?.id;
  const events = await listEvents({ tab, category: cat, limit: 48 });

  const href = (next: { aba?: string; cat?: string }) => {
    const p = new URLSearchParams();
    const aba = next.aba ?? tab;
    const c = "cat" in next ? next.cat : cat;
    if (aba !== "abertos") p.set("aba", aba);
    if (c) p.set("cat", c);
    const qs = p.toString();
    return `/eventos${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Explorar eventos</h1>
          <p className="mt-2 text-muted">Escolha um evento, lacre seu palpite e espere a revelação.</p>
        </div>
        <Link href="/eventos/novo" className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm">
          <Plus size={17} aria-hidden /> Criar evento
        </Link>
      </div>

      <div className="mt-8 flex gap-1 overflow-x-auto rounded-xl border border-line bg-white/[0.03] p-1" role="tablist" aria-label="Fase do evento">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={href({ aba: t.id })}
            role="tab"
            aria-selected={tab === t.id}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition",
              tab === t.id ? "bg-white/10 text-white" : "text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Categorias">
        <Link
          href={href({ cat: undefined })}
          className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition", !cat ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:text-fg")}
        >
          Tudo
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={href({ cat: c.id })}
            className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition", cat === c.id ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:text-fg")}
          >
            <span aria-hidden>{c.emoji}</span> {c.label}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        {events.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nada por aqui ainda"
            body={tab === "abertos" ? "Nenhum evento aberto nesta categoria. Que tal criar o primeiro?" : "Nenhum evento nesta fase."}
          >
            <Link href="/eventos/novo" className="btn-primary rounded-xl px-5 py-3 text-sm">
              Criar evento
            </Link>
          </EmptyState>
        )}
      </div>
    </div>
  );
}
