import { ImageResponse } from "next/og";

export const alt = "Lacre — preveja agora, revele depois";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          color: "#f6f3fc",
          background:
            "radial-gradient(800px 460px at 15% 0%, rgba(255,79,109,0.4), transparent 60%), radial-gradient(800px 460px at 100% 100%, rgba(140,123,255,0.32), transparent 60%), #08070c",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 999,
            background: "linear-gradient(135deg,#ff8a7a,#ff4f6d 60%,#b8203f)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 72,
            fontWeight: 800,
            color: "#fff3e6",
          }}
        >
          L
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, display: "flex" }}>Preveja agora.</div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, color: "#ffb547", display: "flex", marginTop: -30 }}>Revele depois.</div>
      </div>
    ),
    size,
  );
}
