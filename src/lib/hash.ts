import type { Prediction } from "./types";

/**
 * Recalcula, no navegador, o compromisso de um palpite revelado.
 * Fórmula (idêntica à função SQL `compute_commitment`):
 *   sha256(event_id | user_id | option_id | confidence | salt | tese)
 */
export async function computeCommitment(p: Prediction): Promise<string> {
  const text = `${p.event_id}|${p.user_id}|${p.option_id}|${p.confidence}|${p.salt}|${p.thesis}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
