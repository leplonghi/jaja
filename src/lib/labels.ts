import type { TFn } from "@/i18n";
import { isChallenge, topicPhase } from "./format";
import type { Topic } from "./types";

export function phaseLabel(t: TFn, topic: Topic): string {
  const phase = topicPhase(topic);
  if (phase === "waiting" && topic.kind === "free") return t("phase.sealed");
  return t(`phase.${phase}`);
}

export function kindLabel(t: TFn, topic: Topic): string {
  if (topic.kind === "event") return t("kind.event");
  return isChallenge(topic) ? t("kind.challenge") : t("kind.free");
}
