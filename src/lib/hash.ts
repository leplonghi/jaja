import type { Prediction } from "./types";

/**
 * Recalcula, no navegador, o compromisso de uma previsão revelada.
 * Fórmula (idêntica à função SQL `compute_commitment`):
 *   sha256(topic_id | user_id | option_id | confiança | salt | texto)
 * com option_id e confiança vazios quando não existem.
 */
export async function computeCommitment(p: Prediction): Promise<string> {
  const text = `${p.topic_id}|${p.user_id}|${p.option_id ?? ""}|${p.confidence ?? ""}|${p.salt ?? ""}|${p.body ?? ""}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
