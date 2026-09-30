export const CATEGORIES = [
  { id: "politica", label: "Política", emoji: "🗳️" },
  { id: "esportes", label: "Esportes", emoji: "⚽" },
  { id: "cultura", label: "Cultura", emoji: "🎬" },
  { id: "economia", label: "Economia", emoji: "📈" },
  { id: "tecnologia", label: "Tecnologia", emoji: "🤖" },
  { id: "ciencia", label: "Ciência", emoji: "🔬" },
  { id: "outros", label: "Outros", emoji: "✨" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type EventStatus = "open" | "resolved" | "canceled";

/** Fase exibida ao usuário: `locked` = prazo passou, aguardando o resultado. */
export type EventPhase = "open" | "locked" | "resolved" | "canceled";

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}

export interface EventOption {
  id: string;
  event_id: string;
  label: string;
  position: number;
}

export interface EventRow {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: CategoryId;
  locks_at: string;
  status: EventStatus;
  winning_option_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface EventWithMeta extends EventRow {
  options: EventOption[];
  seals: number;
  creator: Profile | null;
}

/** Conteúdo do palpite: só existe para o autor ou depois da revelação. */
export interface Prediction {
  id: string;
  event_id: string;
  user_id: string;
  option_id: string;
  thesis: string;
  confidence: number;
  salt: string;
  commitment: string;
  created_at: string;
}

export interface Seal {
  id: string;
  event_id: string;
  user_id: string;
  commitment: string;
  created_at: string;
  revealed: boolean;
  profile: Profile | null;
  prediction: Prediction | null;
}

export interface LeaderboardRow {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  total: number;
  hits: number;
  accuracy: number;
  brier: number;
}

export interface VaultItem {
  prediction: Prediction;
  event: EventWithMeta;
}

export interface UserStats {
  total: number;
  hits: number;
  accuracy: number | null;
  streak: number;
  pending: number;
  brier: number | null;
}
