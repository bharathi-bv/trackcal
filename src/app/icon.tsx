import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #7B6CF6, #A89AF9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="18" height="18" viewBox="-2 0 20 20" fill="none">
          <path
            d="M14.5 5.5C13 3.7 10.8 2.5 8.2 2.5C4.5 2.5 1.5 5.5 1.5 9.5C1.5 13.5 4.5 16.5 8.2 16.5C10.8 16.5 13 15.3 14.5 13.5"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
