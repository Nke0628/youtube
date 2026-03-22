import React from "react";
import { Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import type { BackgroundSource } from "../types/script";

interface BackgroundProps {
  source: BackgroundSource;
  videoStartFromFrame?: number;
}

export const Background: React.FC<BackgroundProps> = ({
  source,
  videoStartFromFrame = 0,
}) => {
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
        <Sequence from={-videoStartFromFrame}>
          <OffthreadVideo
            src={staticFile(source.path)}
            style={mediaStyle}
            muted
          />
        </Sequence>
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
