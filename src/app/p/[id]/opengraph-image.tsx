import { getT } from "@/i18n/server";
import { getPredictionPage } from "@/lib/data";
import { shortHash } from "@/lib/format";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "jaja";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Card da prova. Só mostra rótulo público, autor e hash: nunca o texto da previsão. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [page, { t }] = await Promise.all([getPredictionPage(id), getT()]);
  if (!page) return ogCard({ kicker: "jaja", title: t("brand.tagline") });
  const { topic, prediction } = page;
  return ogCard({
    kicker: topic.revealed ? t("pp.revealed") : t("pp.sealed"),
    title: topic.title,
    left: prediction.author ? `@${prediction.author.handle}` : "",
    right: `SHA-256 ${shortHash(prediction.commitment)}`,
  });
}
