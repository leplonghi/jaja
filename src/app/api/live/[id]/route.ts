import { NextResponse } from "next/server";
import { getTopic } from "@/lib/data";
import { IS_DEMO } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Número real de previsões de um tópico, para o contador ao vivo. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (IS_DEMO) {
    const t = await getTopic(id);
    return NextResponse.json({ count: t?.seals ?? null });
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ count: null }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("seal_count", { p_id: id });
  if (error) return NextResponse.json({ count: null }, { status: 500 });
  return NextResponse.json({ count: data as number | null }, { headers: { "Cache-Control": "no-store" } });
}
