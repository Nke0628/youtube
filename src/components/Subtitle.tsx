import React from "react";
import { loadFont } from "@remotion/google-fonts/MPlusRounded1c";
import { interpolate, useCurrentFrame } from "remotion";

const { fontFamily } = loadFont("normal", {
  weights: ["800"],
});

interface SubtitleProps {
  text: string;
}

export const Subtitle: React.FC<SubtitleProps> = ({ text }) => {
  const frame = useCurrentFrame();

  // フェードインアニメーション（最初の10フレーム）
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        zIndex: 20,
      }}
    >
      <div
        style={{
          color: "#ffffff",
          fontSize: 56,
          fontWeight: 800,
          padding: "14px 36px",
          maxWidth: "75%",
          textAlign: "center",
          opacity,
          fontFamily,
          textShadow: "3px 3px 0 #16a34a, -3px -3px 0 #16a34a, 3px -3px 0 #16a34a, -3px 3px 0 #16a34a, 0 3px 0 #16a34a, 0 -3px 0 #16a34a, 3px 0 0 #16a34a, -3px 0 0 #16a34a",
          WebkitTextStroke: "2px #16a34a",
          letterSpacing: "0.05em",
        }}
      >
        {text}
      </div>
    </div>
  );
};
