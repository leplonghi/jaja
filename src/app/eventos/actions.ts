"use server";

import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/actions-errors";
import { IS_DEMO } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const DEMO_MSG = "Modo demonstração: conecte o Supabase (veja o README) para lacrar de verdade.";

export async function sealPrediction(input: {
  eventId: string;
  optionId: string;
  thesis: string;
  confidence: number;
}): Promise<Result<{ id: string; commitment: string }>> {
  if (IS_DEMO) return { ok: false, error: DEMO_MSG };

  const thesis = input.thesis.trim();
  if (thesis.length < 10 || thesis.length > 1200) return { ok: false, error: "Sua tese precisa ter entre 10 e 1200 caracteres." };
  if (!Number.isInteger(input.confidence) || input.confidence < 50 || input.confidence > 99)
    return { ok: false, error: "A confiança precisa estar entre 50% e 99%." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("seal_prediction", {
    p_event_id: input.eventId,
    p_option_id: input.optionId,
    p_thesis: thesis,
    p_confidence: input.confidence,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };

  const row = Array.isArray(data) ? data[0] : data;
  revalidatePath(`/eventos/${input.eventId}`);
  revalidatePath("/cofre");
  return { ok: true, id: row.id, commitment: row.commitment };
}

export async function createEvent(input: {
  title: string;
  description: string;
  category: string;
  locksAt: string;
  options: string[];
}): Promise<Result<{ id: string }>> {
  if (IS_DEMO) return { ok: false, error: DEMO_MSG };

  const title = input.title.trim();
  if (title.length < 8 || title.length > 140) return { ok: false, error: "O título precisa ter entre 8 e 140 caracteres." };
  if (!CATEGORIES.some((c) => c.id === input.category)) return { ok: false, error: "Categoria inválida." };
  const locks = new Date(input.locksAt);
  if (Number.isNaN(locks.getTime())) return { ok: false, error: "Data inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_event", {
    p_title: title,
    p_description: input.description.trim().slice(0, 600),
    p_category: input.category,
    p_locks_at: locks.toISOString(),
    p_options: input.options,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath("/eventos");
  revalidatePath("/");
  return { ok: true, id: data as string };
}

export async function resolveEvent(eventId: string, optionId: string): Promise<Result> {
  if (IS_DEMO) return { ok: false, error: DEMO_MSG };
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_event", { p_event_id: eventId, p_option_id: optionId });
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/eventos");
  revalidatePath("/cofre");
  revalidatePath("/ranking");
  return { ok: true };
}

export async function cancelEvent(eventId: string): Promise<Result> {
  if (IS_DEMO) return { ok: false, error: DEMO_MSG };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_event", { p_event_id: eventId });
  if (error) return { ok: false, error: friendlyError(error.message) };
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/eventos");
  return { ok: true };
}
