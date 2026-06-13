import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
        borderRadius: 40,
        display: "flex",
        position: "relative",
      }}
    >
      {/* Car roof */}
      <div
        style={{
          position: "absolute",
          top: 39,
          left: 45,
          right: 45,
          height: 39,
          background: "white",
          borderRadius: "17px 17px 0 0",
        }}
      />
      {/* Car body */}
      <div
        style={{
          position: "absolute",
          top: 73,
          left: 11,
          right: 11,
          height: 56,
          background: "white",
          borderRadius: 11,
        }}
      />
      {/* Left wheel */}
      <div
        style={{
          position: "absolute",
          bottom: 15,
          left: 18,
          width: 50,
          height: 50,
          background: "#1d4ed8",
          borderRadius: "50%",
          border: "11px solid white",
        }}
      />
      {/* Right wheel */}
      <div
        style={{
          position: "absolute",
          bottom: 15,
          right: 18,
          width: 50,
          height: 50,
          background: "#1d4ed8",
          borderRadius: "50%",
          border: "11px solid white",
        }}
      />
    </div>,
    { width: 180, height: 180 },
  );
}
