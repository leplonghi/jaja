"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { createEvent, createFreeTopic } from "@/app/actions";
import type { Key } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/format";
import { CATEGORY_IDS } from "@/lib/types";

/** yyyy-MM-ddTHH:mm no fuso local, para o input datetime-local. */
function localInput(ms: number) {
  const d = new Date(Date.now() + ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const DAY = 86_400_000;
const iso = (local: string) => new Date(local).toISOString();

function Label({ id, children, hint }: { id: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="display-mid text-xl">
        {children}
      </label>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function Choice({ checked, onChange, children, name }: { checked: boolean; onChange: () => void; children: React.ReactNode; name: string }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-ink px-4 py-3 text-sm font-medium transition", checked ? "bg-signal" : "bg-card hover:bg-paper-2")}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="size-4 accent-[#121110]" />
      {children}
    </label>
  );
}

/** Previsão livre (solo) ou desafio com amigos (challenge). */
export function FreeForm({ challenge }: { challenge: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [vis, setVis] = useState<"public" | "link">(challenge ? "link" : "public");
  const [revealMode, setRevealMode] = useState<"date" | "manual">(challenge ? "date" : "date");
  const [revealAt, setRevealAt] = useState(localInput(challenge ? 3 * DAY : 7 * DAY));
  const [locksAt, setLocksAt] = useState(localInput(2 * DAY));
  const [electoral, setElectoral] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [pending, start] = useTransition();

  const valid = body.trim().length >= 10 && (revealMode === "manual" || !!revealAt) && (!challenge || !!locksAt);

  return (
    <form
      className="sheet space-y-7 p-5 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createFreeTopic({
            title,
            body,
            visibility: vis,
            allowJoin: challenge,
            locksAt: challenge ? iso(locksAt) : null,
            revealAt: revealMode === "date" ? iso(revealAt) : null,
            electoral,
            category: electoral ? "politica" : "outros",
          });
          if (r.ok) router.push(`/t/${r.topicId}`);
          else setError(r.error);
        });
      }}
    >
      <p className="text-ink-2">{challenge ? t("new.challenge.intro") : t("new.free.intro")}</p>

      <div>
        <Label id="label" hint={t("new.label.hint")}>
          {t("new.label")}
        </Label>
        <input id="label" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder={t("new.label.ph")} className="field mt-3" />
      </div>

      <div>
        <Label id="body">{t("new.body")}</Label>
        <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={7} placeholder={t("form.body.ph")} className="field mt-3 resize-y leading-relaxed" />
        <div className={cn("mt-1 text-right text-xs numeral", body.length > 0 && body.trim().length < 10 ? "font-semibold text-bad" : "text-muted")}>
          {body.trim().length < 10 && body.length > 0 ? `${t("form.min", { n: 10 })} · ` : ""}
          {body.length}/2000
        </div>
      </div>

      <fieldset>
        <legend className="display-mid text-xl">{t("new.vis")}</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <Choice name="vis" checked={vis === "public"} onChange={() => setVis("public")}>
            {t("new.vis.public")}
          </Choice>
          <Choice name="vis" checked={vis === "link"} onChange={() => setVis("link")}>
            {t("new.vis.link")}
          </Choice>
        </div>
      </fieldset>

      {challenge && (
        <div>
          <Label id="locks">{t("new.join.locks")}</Label>
          <input id="locks" type="datetime-local" value={locksAt} onChange={(e) => setLocksAt(e.target.value)} className="field mt-3 max-w-xs" />
        </div>
      )}

      <fieldset>
        <legend className="display-mid text-xl">{t("new.reveal")}</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <Choice name="reveal" checked={revealMode === "date"} onChange={() => setRevealMode("date")}>
            {t("new.reveal.date")}
          </Choice>
          <Choice name="reveal" checked={revealMode === "manual"} onChange={() => setRevealMode("manual")}>
            {t("new.reveal.manual")}
          </Choice>
        </div>
        {revealMode === "date" && (
          <div className="mt-3">
            <label htmlFor="reveal-at" className="sr-only">
              {t("new.reveal.at")}
            </label>
            <input id="reveal-at" type="datetime-local" value={revealAt} onChange={(e) => setRevealAt(e.target.value)} className="field max-w-xs" />
          </div>
        )}
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-ink bg-card p-4 text-sm">
        <input type="checkbox" checked={electoral} onChange={(e) => setElectoral(e.target.checked)} className="mt-0.5 size-5 accent-[#ff4a1c]" />
        <span>
          <span className="font-semibold">{t("new.electoral")}</span>
          <span className="mt-0.5 block text-muted">{t("new.electoral.hint")}</span>
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-bad">
          {t(error)}
        </p>
      )}
      <button type="submit" disabled={!valid || pending} className="btn btn-signal w-full px-4 py-4 text-base">
        {pending && <Loader2 size={18} className="animate-spin" aria-hidden />}
        {challenge ? t("new.submit.challenge") : t("new.submit.free")}
      </button>
    </form>
  );
}

/** Proposta de evento: pergunta objetiva, com fonte; a equipe revisa. */
export function EventForm({ demo }: { demo: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("outros");
  const [options, setOptions] = useState(["Sim", "Não"]);
  const [locksAt, setLocksAt] = useState(localInput(3 * DAY));
  const [resolveBy, setResolveBy] = useState(localInput(5 * DAY));
  const [sourceNote, setSourceNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [electoral, setElectoral] = useState(false);
  const [error, setError] = useState<Key | null>(null);
  const [pending, start] = useTransition();

  const clean = options.map((o) => o.trim()).filter(Boolean);
  const valid = title.trim().length >= 8 && clean.length >= 2 && sourceNote.trim().length >= 10 && !!locksAt && !!resolveBy;

  return (
    <form
      className="sheet space-y-7 p-5 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createEvent({
            title,
            description,
            category,
            locksAt: iso(locksAt),
            resolveBy: iso(resolveBy),
            sourceNote,
            sourceUrl,
            options: clean,
            electoral,
          });
          if (r.ok) router.push(`/t/${r.id}`);
          else setError(r.error);
        });
      }}
    >
      <p className="text-ink-2">{t("new.event.intro")}</p>
      {demo && <p className="rounded-2xl border-[1.5px] border-ink bg-signal/25 px-4 py-3 text-sm font-medium">{t("new.demoBlock")}</p>}

      <div>
        <Label id="title">{t("new.event.title")}</Label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder={t("new.event.title.ph")} className="field mt-3" />
        <div className="mt-1 text-right text-xs text-muted numeral">{title.length}/140</div>
      </div>

      <div>
        <Label id="desc">{t("new.event.desc")}</Label>
        <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={3} className="field mt-3" />
      </div>

      <fieldset>
        <legend className="display-mid text-xl">{t("new.event.cat")}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORY_IDS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={cn("kicker rounded-full border px-3.5 py-2 transition", category === c ? "border-ink bg-signal" : "border-ink/40 hover:border-ink")}
            >
              {t(`cat.${c}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="display-mid text-xl">{t("new.event.options")}</legend>
        <ul className="mt-3 space-y-2">
          {options.map((o, i) => (
            <li key={i} className="flex gap-2">
              <input
                aria-label={t("new.event.option", { n: i + 1 })}
                value={o}
                maxLength={60}
                onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={t("new.event.option", { n: i + 1 })}
                className="field"
              />
              {options.length > 2 && (
                <button type="button" aria-label={t("new.event.remove", { n: i + 1 })} onClick={() => setOptions(options.filter((_, j) => j !== i))} className="btn btn-line size-12 shrink-0">
                  <X size={16} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
        {options.length < 6 && (
          <button type="button" onClick={() => setOptions([...options, ""])} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4">
            <Plus size={15} aria-hidden /> {t("new.event.add")}
          </button>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label id="locks">{t("new.event.locks")}</Label>
          <input id="locks" type="datetime-local" value={locksAt} onChange={(e) => setLocksAt(e.target.value)} className="field mt-3" />
        </div>
        <div>
          <Label id="resolve">{t("new.event.resolveBy")}</Label>
          <input id="resolve" type="datetime-local" value={resolveBy} onChange={(e) => setResolveBy(e.target.value)} className="field mt-3" />
        </div>
      </div>

      <div>
        <Label id="source">{t("new.event.source")}</Label>
        <input id="source" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} maxLength={300} placeholder={t("new.event.source.ph")} className="field mt-3" />
      </div>
      <div>
        <Label id="surl">{t("new.event.sourceUrl")}</Label>
        <input id="surl" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" className="field mt-3" />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-ink bg-card p-4 text-sm">
        <input type="checkbox" checked={electoral} onChange={(e) => setElectoral(e.target.checked)} className="mt-0.5 size-5 accent-[#ff4a1c]" />
        <span>
          <span className="font-semibold">{t("new.electoral")}</span>
          <span className="mt-0.5 block text-muted">{t("new.electoral.hint")}</span>
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-bad">
          {t(error)}
        </p>
      )}
      <button type="submit" disabled={!valid || pending} className="btn btn-signal w-full px-4 py-4 text-base">
        {pending && <Loader2 size={18} className="animate-spin" aria-hidden />} {t("new.submit.event")}
      </button>
    </form>
  );
}
