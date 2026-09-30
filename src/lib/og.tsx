import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Card social no estilo jaja. Nunca recebe conteúdo de previsão: só rótulos públicos. */
export function ogCard(opts: { kicker: string; title: string; left?: string; right?: string; accent?: string }) {
  const title = opts.title.length > 96 ? `${opts.title.slice(0, 94)}…` : opts.title;
  const big = title.length > 60 ? 62 : title.length > 36 ? 76 : 96;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f3eee4", padding: 36, color: "#121110" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", border: "4px solid #121110", borderRadius: 36, padding: 48, background: "#fbf8f1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 64, fontWeight: 900, letterSpacing: -3 }}>
              jaja
              <div style={{ width: 14, height: 14, borderRadius: 999, background: "#ff4a1c", marginLeft: 4 }} />
            </div>
            <div style={{ display: "flex", padding: "10px 22px", borderRadius: 999, border: "3px solid #121110", background: opts.accent ?? "#ff4a1c", fontSize: 24, fontWeight: 800, letterSpacing: 3 }}>
              {opts.kicker.toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: big, fontWeight: 900, lineHeight: 0.98, letterSpacing: -3 }}>{title}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28, color: "#3b3730" }}>
            <div style={{ display: "flex" }}>{opts.left ?? ""}</div>
            <div style={{ display: "flex", fontFamily: "monospace", fontSize: 26 }}>{opts.right ?? ""}</div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
