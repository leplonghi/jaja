import { cache } from "react";
import { DEMO_LEADERBOARD, DEMO_PROFILES, demoPredictions, demoTopics } from "./demo";
import { createClient } from "./supabase/server";
import { IS_DEMO } from "./supabase/env";
import type {
  AdminQueue,
  LeaderboardRow,
  Prediction,
  PredictionPage,
  Profile,
  Topic,
  VaultItem,
  Viewer,
} from "./types";

const PROFILE_COLS = "id, handle, display_name, avatar_url";
const UUID = /^[0-9a-f-]{36}$/i;

/** Chama uma função SQL (RPC). As regras de sigilo vivem no banco, não aqui. */
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return null;
  return data as T;
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (IS_DEMO) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select(`${PROFILE_COLS}, is_staff, onboarded_at`)
    .eq("id", data.user.id)
    .single();
  if (!p) return null;
  return {
    id: p.id,
    handle: p.handle,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    is_staff: p.is_staff,
    onboarded: !!p.onboarded_at,
  };
});

export type Tab = "open" | "waiting" | "revealed";

export async function listTopics(opts: { tab?: Tab; kind?: "event" | "free"; category?: string; limit?: number } = {}): Promise<Topic[]> {
  const { tab = "open", kind, category, limit = 30 } = opts;
  if (IS_DEMO) {
    const now = Date.now();
    return demoTopics()
      .filter((t) => t.visibility === "public" && ["open", "resolved"].includes(t.status))
      .filter((t) => (kind ? t.kind === kind : true) && (category ? t.category === category : true))
      .filter((t) => {
        if (tab === "revealed") return t.revealed;
        if (t.revealed) return false;
        const open = new Date(t.locks_at).getTime() > now;
        return tab === "open" ? open : !open;
      })
      .sort((a, b) =>
        tab === "open" ? +new Date(a.locks_at) - +new Date(b.locks_at) : +new Date(b.locks_at) - +new Date(a.locks_at),
      )
      .slice(0, limit);
  }
  return (await rpc<Topic[]>("list_topics", { p_tab: tab, p_kind: kind ?? null, p_category: category ?? null, p_limit: limit })) ?? [];
}

export async function getTopic(id: string): Promise<Topic | null> {
  if (IS_DEMO) return demoTopics().find((t) => t.id === id) ?? null;
  if (!UUID.test(id)) return null;
  return rpc<Topic>("get_topic", { p_id: id });
}

export async function getPredictions(topicId: string): Promise<Prediction[]> {
  if (IS_DEMO) return demoPredictions(topicId);
  if (!UUID.test(topicId)) return [];
  return (await rpc<Prediction[]>("get_predictions", { p_id: topicId })) ?? [];
}

export async function getPredictionPage(id: string): Promise<PredictionPage | null> {
  if (IS_DEMO) {
    for (const t of demoTopics()) {
      const p = demoPredictions(t.id).find((x) => x.id === id);
      if (p) {
        const author = DEMO_PROFILES.find((x) => x.id === p.user_id) ?? null;
        return { topic: t, prediction: { ...p, author } };
      }
    }
    return null;
  }
  if (!UUID.test(id)) return null;
  return rpc<PredictionPage>("get_prediction", { p_id: id });
}

export async function getVault(): Promise<VaultItem[]> {
  if (IS_DEMO) return [];
  return (await rpc<VaultItem[]>("my_vault")) ?? [];
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
  return ((data ?? []) as LeaderboardRow[]).map((r) => ({
    ...r,
    accuracy: Number(r.accuracy),
    brier: r.brier == null ? null : Number(r.brier),
  }));
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  if (IS_DEMO) return DEMO_PROFILES.find((p) => p.handle === handle) ?? null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select(PROFILE_COLS).eq("handle", handle).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function getProfileHistory(profile: Profile): Promise<{ items: VaultItem[]; pending: number }> {
  if (IS_DEMO) {
    const items = demoTopics()
      .filter((t) => t.revealed && t.visibility === "public")
      .flatMap((topic) =>
        demoPredictions(topic.id)
          .filter((p) => p.user_id === profile.id)
          .map((prediction) => ({ prediction, topic })),
      );
    return { items, pending: 2 };
  }
  return (await rpc<{ items: VaultItem[]; pending: number }>("profile_history", { p_user_id: profile.id })) ?? { items: [], pending: 0 };
}

export async function getAdminQueue(): Promise<AdminQueue | null> {
  if (IS_DEMO) return null;
  return rpc<AdminQueue>("admin_queue");
}
