import { ImageResponse } from "next/og";
import { getSeal } from "@/lib/data";
import { phaseOf, shortHash } from "@/lib/format";

export const alt = "Palpite lacrado no Lacre";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Card social do lacre. Nunca inclui o conteúdo do palpite antes da revelação. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getSeal(id);
  const title = found?.event.title ?? "Palpite lacrado";
  const who = found?.seal.profile?.display_name ?? "Alguém";
  const revealed = found ? phaseOf(found.event) === "resolved" : false;
  const hash = found ? shortHash(found.seal.commitment) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#f6f3fc",
          background:
            "radial-gradient(700px 420px at 10% 0%, rgba(255,79,109,0.35), transparent 60%), radial-gradient(700px 420px at 100% 100%, rgba(140,123,255,0.30), transparent 60%), #08070c",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "linear-gradient(135deg,#ff8a7a,#ff4f6d 60%,#b8203f)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "#fff3e6",
            }}
          >
            L
          </div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>Lacre</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 26, letterSpacing: 6, color: "#ffb547", fontWeight: 700 }}>
            {revealed ? "PALPITE REVELADO" : "PALPITE LACRADO"}
          </div>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5, display: "flex" }}>
            {title.length > 90 ? `${title.slice(0, 88)}…` : title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28, color: "#a49eb8" }}>
          <div style={{ display: "flex" }}>
            {who} {revealed ? "previu" : "lacrou — revela depois"}
          </div>
          {hash && (
            <div style={{ display: "flex", padding: "10px 18px", borderRadius: 12, background: "rgba(140,123,255,0.15)", color: "#8c7bff", fontFamily: "monospace" }}>
              SHA-256 {hash}
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
