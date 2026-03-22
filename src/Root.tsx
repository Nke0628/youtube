import "./index.css";
import { Composition } from "remotion";
import {
  ZundamonVideo,
  zundamonVideoSchema,
  groupIntoSegments,
} from "./components/ZundamonVideo";
import type { ProcessedVideoScript } from "./types/script";
import scriptData from "../data/Claude Code 入門.processed.json";

const script = scriptData as ProcessedVideoScript;

// セグメントの合計フレーム数から実際の動画長を計算
const allLines = script.sections.flatMap((s) => s.lines);
const segments = groupIntoSegments(allLines);
const actualDurationInFrames = segments.reduce((sum, seg) => sum + seg.totalFrames, 0);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ZundamonVideo"
        component={ZundamonVideo}
        schema={zundamonVideoSchema}
        durationInFrames={actualDurationInFrames}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          script,
        }}
      />
    </>
  );
};
