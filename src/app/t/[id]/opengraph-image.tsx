import { getT } from "@/i18n/server";
import { getTopic } from "@/lib/data";
import { topicPhase } from "@/lib/format";
import { kindLabel, phaseLabel } from "@/lib/labels";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "jaja";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [topic, { t, tp }] = await Promise.all([getTopic(id), getT()]);
  if (!topic) return ogCard({ kicker: "jaja", title: t("brand.tagline") });
  const phase = topicPhase(topic);
  return ogCard({
    kicker: `${kindLabel(t, topic)} · ${phaseLabel(t, topic)}`,
    title: topic.title,
    left: tp("count.seals", topic.seals),
    accent: phase === "revealed" ? "#121110" : "#ff4a1c",
  });
}
