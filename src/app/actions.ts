"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, isLocale, type Key } from "@/i18n";
import { getT } from "@/i18n/server";
import { getViewer } from "@/lib/data";
import { errorKey } from "@/lib/errors";
import { IS_DEMO } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_IDS } from "@/lib/types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: Key };

const demo = (): { ok: false; error: Key } => ({ ok: false, error: "common.demoAction" });
const fail = (message: string | undefined): { ok: false; error: Key } => ({ ok: false, error: errorKey(message) });
const category = (c: string) => ((CATEGORY_IDS as readonly string[]).includes(c) ? c : "outros");

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function completeOnboarding(
  adult: boolean,
  terms: boolean,
  handle: string,
  displayName: string,
): Promise<Result> {
  if (IS_DEMO) return demo();
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_adult_ok: adult,
    p_terms_ok: terms,
    p_handle: handle,
    p_display_name: displayName,
  });
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function sealPrediction(input: {
  topicId: string;
  optionId: string | null;
  body: string;
  confidence: number | null;
}): Promise<Result<{ id: string; commitment: string }>> {
  if (IS_DEMO) return demo();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("seal_prediction", {
    p_topic_id: input.topicId,
    p_option_id: input.optionId,
    p_body: input.body,
    p_confidence: input.confidence,
  });
  if (error) return fail(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  revalidatePath(`/t/${input.topicId}`);
  revalidatePath("/vault");
  return { ok: true, id: row.id, commitment: row.commitment };
}

export async function createFreeTopic(input: {
  title: string;
  body: string;
  visibility: "public" | "link";
  allowJoin: boolean;
  locksAt: string | null;
  revealAt: string | null;
  electoral: boolean;
  category: string;
}): Promise<Result<{ topicId: string; predictionId: string; commitment: string }>> {
  if (IS_DEMO) return demo();
  const viewer = await getViewer();
  const { t } = await getT();
  const title = input.title.trim() || t("topic.noLabel", { handle: viewer?.handle ?? "jaja" });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_free_topic", {
    p_title: title,
    p_body: input.body,
    p_visibility: input.visibility,
    p_allow_join: input.allowJoin,
    p_locks_at: input.locksAt,
    p_reveal_at: input.revealAt,
    p_is_electoral: input.electoral,
    p_category: category(input.category),
  });
  if (error) return fail(error.message);
  revalidatePath("/explore");
  revalidatePath("/vault");
  return { ok: true, topicId: data.topic_id, predictionId: data.prediction_id, commitment: data.commitment };
}

export async function createEvent(input: {
  title: string;
  description: string;
  category: string;
  locksAt: string;
  resolveBy: string;
  sourceNote: string;
  sourceUrl: string;
  options: string[];
  electoral: boolean;
}): Promise<Result<{ id: string }>> {
  if (IS_DEMO) return demo();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_event", {
    p_title: input.title,
    p_description: input.description.trim().slice(0, 600),
    p_category: category(input.category),
    p_locks_at: input.locksAt,
    p_resolve_by: input.resolveBy,
    p_source_note: input.sourceNote,
    p_source_url: input.sourceUrl.trim() || null,
    p_options: input.options,
    p_is_electoral: input.electoral,
  });
  if (error) return fail(error.message);
  revalidatePath("/explore");
  revalidatePath("/");
  return { ok: true, id: data as string };
}

export async function revealNow(topicId: string): Promise<Result> {
  if (IS_DEMO) return demo();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reveal_now", { p_topic_id: topicId });
  if (error) return fail(error.message);
  revalidatePath(`/t/${topicId}`);
  revalidatePath("/vault");
  return { ok: true };
}

export async function cancelTopic(topicId: string): Promise<Result> {
  if (IS_DEMO) return demo();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_topic", { p_topic_id: topicId });
  if (error) return fail(error.message);
  revalidatePath(`/t/${topicId}`);
  revalidatePath("/explore");
  return { ok: true };
}

export async function reportContent(topicId: string, predictionId: string | null, reason: string): Promise<Result> {
  if (IS_DEMO) return demo();
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_content", {
    p_topic_id: topicId,
    p_prediction_id: predictionId,
    p_reason: reason,
  });
  if (error) return fail(error.message);
  return { ok: true };
}

/* ------------------------------------------------------------ equipe ---- */

async function adminRpc(fn: string, args: Record<string, unknown>): Promise<Result> {
  if (IS_DEMO) return demo();
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return fail(error.message);
  revalidatePath("/admin");
  revalidatePath("/explore");
  revalidatePath("/ranking");
  return { ok: true };
}

export async function reviewTopic(topicId: string, approve: boolean): Promise<Result> {
  return adminRpc("review_topic", { p_topic_id: topicId, p_approve: approve });
}
export async function reviewPrediction(id: string, approve: boolean): Promise<Result> {
  return adminRpc("review_prediction", { p_prediction_id: id, p_approve: approve });
}
export async function releaseElectoral(topicId: string): Promise<Result> {
  return adminRpc("release_electoral", { p_topic_id: topicId });
}
export async function resolveEvent(topicId: string, optionId: string): Promise<Result> {
  return adminRpc("resolve_event", { p_topic_id: topicId, p_option_id: optionId });
}
