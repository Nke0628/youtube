import React from "react";
import { Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { BackgroundSource } from "../types/script";

interface BackgroundProps {
  source: BackgroundSource;
  audioDurationInSeconds: number;
}

export const Background: React.FC<BackgroundProps> = ({
  source,
  audioDurationInSeconds,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  };

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  if (source.type === "image") {
    return (
      <div style={containerStyle}>
        <Img src={staticFile(source.path)} style={mediaStyle} />
      </div>
    );
  }

  if (source.type === "video") {
    return (
      <div style={containerStyle}>
        <OffthreadVideo
          src={staticFile(source.path)}
          style={mediaStyle}
          muted
        />
      </div>
    );
  }

  // 自動生成の場合はグラデーション背景をフォールバック表示
  return (
    <div
      style={{
        ...containerStyle,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    />
  );
};
