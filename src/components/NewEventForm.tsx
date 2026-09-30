"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { createEvent } from "@/app/eventos/actions";
import { cn } from "@/lib/format";
import { CATEGORIES } from "@/lib/types";

/** yyyy-MM-ddTHH:mm no fuso local, para o input datetime-local. */
function localInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PRESETS = [
  { label: "Sim ou Não", options: ["Sim", "Não"] },
  { label: "Vence / Empata / Perde", options: ["Vence", "Empata", "Perde"] },
];

export function NewEventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("outros");
  const [options, setOptions] = useState(["Sim", "Não"]);
  const [locksAt, setLocksAt] = useState(() => localInput(new Date(Date.now() + 3 * 86400_000)));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  const valid = title.trim().length >= 8 && cleanOptions.length >= 2 && !!locksAt;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createEvent({
        title,
        description,
        category,
        locksAt: new Date(locksAt).toISOString(),
        options: cleanOptions,
      });
      if (res.ok) router.push(`/eventos/${res.id}`);
      else setError(res.error);
    });
  }

  const field = "mt-2 w-full rounded-xl border border-line bg-black/30 px-4 py-3 text-sm placeholder:text-faint focus:border-gold/60 focus:outline-none";

  return (
    <form onSubmit={submit} className="card space-y-7 p-5 sm:p-8">
      <div>
        <label htmlFor="title" className="text-sm font-semibold">
          Qual é a pergunta?
        </label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Ex.: O time da casa vence o clássico?" className={field} />
        <div className="mt-1 text-right text-xs tabular-nums text-faint">{title.length}/140</div>
      </div>

      <div>
        <label htmlFor="desc" className="text-sm font-semibold">
          Como o resultado será definido? <span className="font-normal text-faint">(opcional, mas recomendado)</span>
        </label>
        <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={3} placeholder="Cite a fonte oficial. Ex.: resultado divulgado pelo TSE / placar final no site da liga." className={field} />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Categoria</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategory(c.id)}
              aria-pressed={category === c.id}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", category === c.id ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:text-fg")}
            >
              <span aria-hidden>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">Opções de resultado (2 a 6)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button type="button" key={p.label} onClick={() => setOptions(p.options)} className="btn-ghost rounded-lg px-3 py-1.5 text-xs font-semibold text-muted">
              {p.label}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-2">
          {options.map((o, i) => (
            <li key={i} className="flex gap-2">
              <input
                aria-label={`Opção ${i + 1}`}
                value={o}
                maxLength={60}
                onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Opção ${i + 1}`}
                className="w-full rounded-xl border border-line bg-black/30 px-4 py-2.5 text-sm placeholder:text-faint focus:border-gold/60 focus:outline-none"
              />
              {options.length > 2 && (
                <button type="button" aria-label={`Remover opção ${i + 1}`} onClick={() => setOptions(options.filter((_, j) => j !== i))} className="btn-ghost grid size-11 shrink-0 place-items-center rounded-xl">
                  <X size={16} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
        {options.length < 6 && (
          <button type="button" onClick={() => setOptions([...options, ""])} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline">
            <Plus size={15} aria-hidden /> Adicionar opção
          </button>
        )}
      </fieldset>

      <div>
        <label htmlFor="locks" className="text-sm font-semibold">
          Até quando dá para lacrar?
        </label>
        <p className="mt-1 text-xs text-muted">Feche antes do evento começar. Depois desse prazo ninguém mais lacra, e você poderá informar o resultado.</p>
        <input id="locks" type="datetime-local" value={locksAt} onChange={(e) => setLocksAt(e.target.value)} className={cn(field, "max-w-xs")} />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-bad/10 px-3 py-2.5 text-sm text-bad">
          {error}
        </p>
      )}

      <button type="submit" disabled={!valid || pending} className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-base">
        {pending && <Loader2 size={18} className="animate-spin" aria-hidden />} Publicar evento
      </button>
      <p className="text-center text-xs text-faint">Você será quem informa o resultado final. Seja justo: sua reputação está em jogo.</p>
    </form>
  );
}
