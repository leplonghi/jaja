import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lacre — palpites lacrados",
    short_name: "Lacre",
    description: "Preveja agora, revele depois.",
    start_url: "/",
    display: "standalone",
    background_color: "#08070c",
    theme_color: "#08070c",
    lang: "pt-BR",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
