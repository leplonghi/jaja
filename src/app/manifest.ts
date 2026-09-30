import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "jaja",
    short_name: "jaja",
    description: "Preveja agora. Revele já já.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3eee4",
    theme_color: "#f3eee4",
    lang: "pt-BR",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
