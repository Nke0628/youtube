import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { isMouthOpen } from "../utils/timing";

interface ZundamonProps {
  audioDurationInSeconds: number;
}

export const Zundamon: React.FC<ZundamonProps> = ({ audioDurationInSeconds }) => {
  const frame = useCurrentFrame();
  const mouthOpen = isMouthOpen(frame, audioDurationInSeconds);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        right: 40,
        zIndex: 10,
      }}
    >
      <Img
        src={staticFile(
          mouthOpen
            ? "backgrounds/shared/mouth_open.png"
            : "backgrounds/shared/mouth_close.png"
        )}
        style={{
          height: 550,
          objectFit: "contain",
        }}
      />
    </div>
  );
};
