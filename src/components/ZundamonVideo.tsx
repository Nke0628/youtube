import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { z } from "zod";
import { calculateLineDurationInFrames } from "../utils/timing";
import { DialogueLineComponent } from "./DialogueLine";

// Remotion Compositionに渡すためのzodスキーマ
const backgroundSourceSchema = z.union([
  z.object({ type: z.literal("image"), id: z.string(), path: z.string() }),
  z.object({ type: z.literal("video"), id: z.string(), path: z.string() }),
  z.object({ type: z.literal("auto") }),
]);

const processedDialogueLineSchema = z.object({
  text: z.string(),
  background: backgroundSourceSchema,
  audioFile: z.string(),
  audioDurationInSeconds: z.number(),
  videoDurationInSeconds: z.number().optional(),
});

const processedSectionSchema = z.object({
  title: z.string(),
  lines: z.array(processedDialogueLineSchema),
});

export const zundamonVideoSchema = z.object({
  script: z.object({
    id: z.string(),
    title: z.string(),
    sections: z.array(processedSectionSchema),
    totalDurationInFrames: z.number(),
  }),
});

type ZundamonVideoProps = z.infer<typeof zundamonVideoSchema>;

export const ZundamonVideo: React.FC<ZundamonVideoProps> = ({ script }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {script.sections.flatMap((section, si) =>
          section.lines.map((line, li) => (
            <Series.Sequence
              key={`${si}-${li}`}
              durationInFrames={calculateLineDurationInFrames(line)}
            >
              <DialogueLineComponent line={line} />
            </Series.Sequence>
          ))
        )}
      </Series>
    </AbsoluteFill>
  );
};
