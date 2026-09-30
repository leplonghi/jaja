export const CATEGORY_IDS = ["politica", "esportes", "cultura", "economia", "tecnologia", "ciencia", "outros"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type TopicKind = "event" | "free";
export type TopicStatus = "pending_review" | "open" | "resolved" | "canceled" | "blocked";
export type Visibility = "public" | "link";
export type ModerationStatus = "ok" | "flagged" | "blocked";

/** Fase exibida: derivada do status, da revelação e do prazo. */
export type TopicPhase = "open" | "waiting" | "revealed" | "canceled" | "pending" | "blocked";

export interface Profile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Viewer extends Profile {
  is_staff: boolean;
  onboarded: boolean;
}

export interface TopicOption {
  id: string;
  label: string;
  position: number;
}

export interface Topic {
  id: string;
  kind: TopicKind;
  title: string;
  description: string | null;
  category: CategoryId;
  visibility: Visibility;
  status: TopicStatus;
  locks_at: string;
  reveal_at: string | null;
  resolve_by: string | null;
  source_note: string | null;
  source_url: string | null;
  allow_join: boolean;
  is_electoral: boolean;
  released: boolean;
  winning_option_id: string | null;
  resolved_at: string | null;
  revealed_at: string | null;
  created_at: string;
  revealed: boolean;
  seals: number;
  options: TopicOption[];
  host: Profile | null;
  my_prediction_id: string | null;
}

/** Uma previsão como o servidor a entrega: conteúdo só quando revelada (ou se for sua). */
export interface Prediction {
  id: string;
  topic_id: string;
  user_id: string;
  created_at: string;
  commitment: string;
  mine: boolean;
  held: boolean;
  handle?: string;
  display_name?: string;
  avatar_url?: string | null;
  option_id?: string | null;
  body?: string;
  confidence?: number | null;
  salt?: string;
  moderation?: ModerationStatus;
}

export interface PredictionPage {
  topic: Topic;
  prediction: Prediction & { author: Profile | null };
}

export interface VaultItem {
  prediction: Prediction;
  topic: Topic;
}

export interface LeaderboardRow {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  total: number;
  hits: number;
  accuracy: number;
  brier: number | null;
}

export interface UserStats {
  total: number;
  hits: number;
  accuracy: number | null;
  streak: number;
  pending: number;
  brier: number | null;
}

export interface AdminQueue {
  pending_topics: Topic[];
  flagged_predictions: { id: string; topic_id: string; topic_title: string; body: string; created_at: string; handle: string }[];
  electoral_to_release: Topic[];
  events_to_resolve: Topic[];
  recent_reports: { id: string; topic_id: string; prediction_id: string | null; reason: string; created_at: string }[];
}
