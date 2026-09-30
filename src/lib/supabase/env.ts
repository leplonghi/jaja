// Acessos estáticos a process.env: o Next só embute variáveis NEXT_PUBLIC_ assim.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sem Supabase configurado o app roda em modo demonstração (somente leitura). */
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_KEY;
