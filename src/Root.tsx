import "./index.css";
import { Composition } from "remotion";
import { ZundamonVideo, zundamonVideoSchema } from "./components/ZundamonVideo";
import type { ProcessedVideoScript } from "./types/script";
import scriptData from "../data/Claude Code 入門.processed.json";

const script = scriptData as ProcessedVideoScript;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ZundamonVideo"
        component={ZundamonVideo}
        schema={zundamonVideoSchema}
        durationInFrames={script.totalDurationInFrames}
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
