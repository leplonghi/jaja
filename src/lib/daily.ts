import type { Topic } from "./types";

const DAY = 86_400_000;

/** Palpite do dia: o evento objetivo que fecha em menos de 24 h, senão o que fecha primeiro. */
export function pickDaily(openTopics: Topic[], now = Date.now()): Topic | undefined {
  const events = openTopics.filter((x) => x.kind === "event" && x.options.length >= 2);
  return events.find((x) => new Date(x.locks_at).getTime() - now < DAY) ?? events[0];
}
