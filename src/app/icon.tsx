import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", borderRadius: 14, background: "#ff4a1c", border: "4px solid #121110", display: "flex", alignItems: "center", justifyContent: "center", color: "#121110", fontSize: 44, fontWeight: 900 }}>
        j
      </div>
    ),
    size,
  );
}
