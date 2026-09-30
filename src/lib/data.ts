import { cache } from "react";
import { DEMO_LEADERBOARD, DEMO_PROFILES, demoEvents, demoPredictions, demoSeals } from "./demo";
import { createClient } from "./supabase/server";
import { IS_DEMO } from "./supabase/env";
import type {
  EventOption,
  EventRow,
  EventWithMeta,
  LeaderboardRow,
  Prediction,
  Profile,
  Seal,
  VaultItem,
} from "./types";

const PROFILE_COLS = "id, handle, display_name, avatar_url";

export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  if (IS_DEMO) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select(PROFILE_COLS).eq("id", data.user.id).single();
  return (profile as Profile | null) ?? null;
});

/** Anexa opções, contagem de lacres e criador a uma lista de eventos. */
async function hydrate(rows: EventRow[]): Promise<EventWithMeta[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const ids = rows.map((r) => r.id);
  const creatorIds = [...new Set(rows.map((r) => r.creator_id))];

  const [opts, counts, creators] = await Promise.all([
    supabase.from("event_options").select("*").in("event_id", ids).order("position"),
    supabase.from("event_seal_counts").select("event_id, seals").in("event_id", ids),
    supabase.from("profiles").select(PROFILE_COLS).in("id", creatorIds),
  ]);

  const optionsBy = new Map<string, EventOption[]>();
  for (const o of (opts.data ?? []) as EventOption[]) {
    optionsBy.set(o.event_id, [...(optionsBy.get(o.event_id) ?? []), o]);
  }
  const countBy = new Map((counts.data ?? []).map((c: { event_id: string; seals: number }) => [c.event_id, c.seals]));
  const creatorBy = new Map(((creators.data ?? []) as Profile[]).map((p) => [p.id, p]));

  return rows.map((r) => ({
    ...r,
    options: optionsBy.get(r.id) ?? [],
    seals: countBy.get(r.id) ?? 0,
    creator: creatorBy.get(r.creator_id) ?? null,
  }));
}

export type EventTab = "abertos" | "aguardando" | "revelados";

export async function listEvents(opts: { tab?: EventTab; category?: string; limit?: number } = {}): Promise<EventWithMeta[]> {
  const { tab = "abertos", category, limit = 30 } = opts;

  if (IS_DEMO) {
    const now = Date.now();
    return demoEvents()
      .filter((e) => (category ? e.category === category : true))
      .filter((e) => {
        if (tab === "revelados") return e.status === "resolved";
        if (e.status !== "open") return false;
        const open = new Date(e.locks_at).getTime() > now;
        return tab === "abertos" ? open : !open;
      })
      .sort((a, b) => b.seals - a.seals)
      .slice(0, limit);
  }

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  let q = supabase.from("events").select("*").limit(limit);
  if (category) q = q.eq("category", category);
  if (tab === "abertos") q = q.eq("status", "open").gt("locks_at", nowIso).order("locks_at");
  if (tab === "aguardando") q = q.eq("status", "open").lte("locks_at", nowIso).order("locks_at", { ascending: false });
  if (tab === "revelados") q = q.eq("status", "resolved").order("resolved_at", { ascending: false });
  const { data } = await q;
  return hydrate((data ?? []) as EventRow[]);
}

export async function getEvent(id: string): Promise<EventWithMeta | null> {
  if (IS_DEMO) return demoEvents().find((e) => e.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return (await hydrate([data as EventRow]))[0];
}

/** Lacres públicos de um evento + conteúdo (o RLS só devolve o que você pode ver). */
export async function getSeals(eventId: string): Promise<Seal[]> {
  if (IS_DEMO) return demoSeals(eventId);
  const supabase = await createClient();
  const [seals, preds] = await Promise.all([
    supabase
      .from("public_seals")
      .select("id, event_id, user_id, commitment, created_at, revealed")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("predictions").select("*").eq("event_id", eventId),
  ]);
  const rows = (seals.data ?? []) as Omit<Seal, "profile" | "prediction">[];
  const predBy = new Map(((preds.data ?? []) as Prediction[]).map((p) => [p.id, p]));
  const { data: profiles } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .in("id", [...new Set(rows.map((r) => r.user_id))]);
  const profBy = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, profile: profBy.get(r.user_id) ?? null, prediction: predBy.get(r.id) ?? null }));
}

/** Um único lacre (página pública /p/[id]). */
export async function getSeal(id: string): Promise<{ seal: Seal; event: EventWithMeta } | null> {
  if (IS_DEMO) {
    for (const e of demoEvents()) {
      const s = demoSeals(e.id).find((x) => x.id === id);
      if (s) return { seal: s, event: e };
    }
    return null;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("public_seals")
    .select("id, event_id, user_id, commitment, created_at, revealed")
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;
  const [event, pred, prof] = await Promise.all([
    getEvent(row.event_id),
    supabase.from("predictions").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select(PROFILE_COLS).eq("id", row.user_id).maybeSingle(),
  ]);
  if (!event) return null;
  return {
    seal: { ...row, profile: (prof.data as Profile | null) ?? null, prediction: (pred.data as Prediction | null) ?? null },
    event,
  };
}

/** Todos os palpites do usuário logado (o RLS já garante que são só dele). */
export async function getVault(userId: string): Promise<VaultItem[]> {
  if (IS_DEMO) return [];
  const supabase = await createClient();
  const { data: preds } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  const predictions = (preds ?? []) as Prediction[];
  if (!predictions.length) return [];
  const { data: evs } = await supabase.from("events").select("*").in("id", [...new Set(predictions.map((p) => p.event_id))]);
  const events = await hydrate((evs ?? []) as EventRow[]);
  const byId = new Map(events.map((e) => [e.id, e]));
  return predictions.flatMap((prediction) => {
    const event = byId.get(prediction.event_id);
    return event ? [{ prediction, event }] : [];
  });
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  if (IS_DEMO) return DEMO_LEADERBOARD;
  const supabase = await createClient();
  const { data } = await supabase
    .from("leaderboard")
    .select("*")
    .order("accuracy", { ascending: false })
    .order("total", { ascending: false })
    .limit(limit);
  return ((data ?? []) as LeaderboardRow[]).map((r) => ({ ...r, accuracy: Number(r.accuracy), brier: Number(r.brier) }));
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  if (IS_DEMO) return DEMO_PROFILES.find((p) => p.handle === handle) ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLS).eq("handle", handle).maybeSingle();
  return (data as Profile | null) ?? null;
}

/** Palpites REVELADOS de um usuário (perfil público). Lacres pendentes só contam. */
export async function getPublicHistory(profile: Profile): Promise<{ items: VaultItem[]; pending: number }> {
  if (IS_DEMO) {
    const items = demoEvents()
      .filter((e) => e.status === "resolved")
      .flatMap((event) =>
        demoPredictions(event.id)
          .filter((p) => p.user_id === profile.id)
          .map((prediction) => ({ prediction, event })),
      );
    return { items, pending: 2 };
  }
  const supabase = await createClient();
  const { data: seals } = await supabase.from("public_seals").select("id, event_id, revealed").eq("user_id", profile.id);
  const rows = (seals ?? []) as { id: string; event_id: string; revealed: boolean }[];
  const pending = rows.filter((r) => !r.revealed).length;
  const revealedIds = rows.filter((r) => r.revealed).map((r) => r.id);
  if (!revealedIds.length) return { items: [], pending };
  const { data: preds } = await supabase.from("predictions").select("*").in("id", revealedIds).order("created_at", { ascending: false });
  const predictions = (preds ?? []) as Prediction[];
  const { data: evs } = await supabase.from("events").select("*").in("id", [...new Set(predictions.map((p) => p.event_id))]);
  const events = await hydrate((evs ?? []) as EventRow[]);
  const byId = new Map(events.map((e) => [e.id, e]));
  return {
    pending,
    items: predictions.flatMap((prediction) => {
      const event = byId.get(prediction.event_id);
      return event ? [{ prediction, event }] : [];
    }),
  };
}
