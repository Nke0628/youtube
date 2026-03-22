import React from "react";
import { Audio, staticFile } from "remotion";
import type { ProcessedDialogueLine } from "../types/script";
import { Background } from "./Background";
import { Subtitle } from "./Subtitle";
import { Zundamon } from "./Zundamon";

interface DialogueLineProps {
  line: ProcessedDialogueLine;
  videoStartFromFrame?: number;
}

export const DialogueLineComponent: React.FC<DialogueLineProps> = ({
  line,
  videoStartFromFrame = 0,
}) => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      {/* 背景 */}
      <Background
        source={line.background}
        videoStartFromFrame={videoStartFromFrame}
      />

      {/* 音声再生 */}
      <Audio src={staticFile(line.audioFile)} />

      {/* ずんだもん */}
      <Zundamon audioDurationInSeconds={line.audioDurationInSeconds} />

      {/* 字幕 */}
      <Subtitle text={line.text} />
    </div>
  );
};
