import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 999,
          background: "linear-gradient(135deg,#ff8a7a,#ff4f6d 60%,#b8203f)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff3e6",
          fontSize: 40,
          fontWeight: 800,
        }}
      >
        L
      </div>
    ),
    size,
  );
}
