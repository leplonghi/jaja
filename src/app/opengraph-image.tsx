import { getT } from "@/i18n/server";
import { OG_SIZE, ogCard } from "@/lib/og";

export const alt = "jaja";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const { t } = await getT();
  return ogCard({ kicker: "jaja", title: t("brand.tagline"), left: t("brand.desc").slice(0, 70) + "…" });
}
