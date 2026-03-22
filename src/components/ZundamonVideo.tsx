import React from "react";
import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { z } from "zod";
import { calculateLineDurationInFrames, FPS } from "../utils/timing";
import { Background } from "./Background";
import { Subtitle } from "./Subtitle";
import { Zundamon } from "./Zundamon";

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
type Line = z.infer<typeof processedDialogueLineSchema>;

// 背景のキーを取得（同じキー = 同じ背景）
function getBgKey(bg: Line["background"]): string {
  if (bg.type === "auto") return "auto";
  return `${bg.type}:${bg.path}`;
}

// 同じ背景の連続セリフをセグメントにグループ化
interface Segment {
  background: Line["background"];
  lines: Line[];
  totalFrames: number;
}

export function groupIntoSegments(allLines: Line[]): Segment[] {
  const segments: Segment[] = [];

  for (const line of allLines) {
    const key = getBgKey(line.background);
    const last = segments[segments.length - 1];

    if (last && getBgKey(last.background) === key) {
      last.lines.push(line);
      last.totalFrames += calculateLineDurationInFrames(line);
    } else {
      segments.push({
        background: line.background,
        lines: [line],
        totalFrames: calculateLineDurationInFrames(line),
      });
    }
  }

  // 動画背景のセグメントで、動画の方が音声合計より長い場合は動画に合わせる
  for (const segment of segments) {
    if (segment.background.type === "video") {
      const videoDuration = segment.lines[0].videoDurationInSeconds;
      if (videoDuration) {
        const videoFrames = Math.ceil(videoDuration * FPS);
        if (videoFrames > segment.totalFrames) {
          segment.totalFrames = videoFrames;
        }
      }
    }
  }

  return segments;
}

export const ZundamonVideo: React.FC<ZundamonVideoProps> = ({ script }) => {
  const allLines = script.sections.flatMap((section) => section.lines);
  const segments = groupIntoSegments(allLines);

  let segmentIndex = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* BGM: 動画全体で再生（Seriesの外に置いて途切れを防ぐ） */}
      <Audio src={staticFile("bgm/bgm.mp3")} volume={0.05} />

      <Series>
        {segments.map((segment) => {
          const key = `seg-${segmentIndex++}`;
          return (
            <Series.Sequence key={key} durationInFrames={segment.totalFrames}>
              <AbsoluteFill>
                {/* 背景: セグメント全体で1つだけレンダリング（動画が途切れない） */}
                <Background source={segment.background} />

                {/* ずんだもん: セグメント全体で表示し続ける（口パクは音声がないと閉じる） */}
                <Zundamon audioDurationInSeconds={0} />

                {/* セリフ: セグメント内でSeriesで切り替え */}
                <Series>
                  {segment.lines.map((line, li) => (
                    <Series.Sequence
                      key={li}
                      durationInFrames={calculateLineDurationInFrames(line)}
                    >
                      <Audio src={staticFile(line.audioFile)} />
                      <Zundamon
                        audioDurationInSeconds={line.audioDurationInSeconds}
                      />
                      <Subtitle text={line.text} />
                    </Series.Sequence>
                  ))}
                </Series>
              </AbsoluteFill>
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
