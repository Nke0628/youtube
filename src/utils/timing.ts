import type { ProcessedDialogueLine } from "../types/script";

export const FPS = 30;
export const MARGIN_SECONDS = 0.3;
export const MOUTH_TOGGLE_INTERVAL = 5; // 5フレームごとに口を切り替え

// セリフ1行の表示フレーム数を計算
export function calculateLineDurationInFrames(line: ProcessedDialogueLine): number {
  const audioDuration = line.audioDurationInSeconds;

  if (line.background.type === "video" && line.videoDurationInSeconds) {
    const contentDuration = Math.max(audioDuration, line.videoDurationInSeconds);
    return Math.ceil((contentDuration + MARGIN_SECONDS) * FPS);
  }

  return Math.ceil((audioDuration + MARGIN_SECONDS) * FPS);
}

// 音声再生中かどうかを判定
export function isAudioPlaying(
  currentFrame: number,
  audioDurationInSeconds: number,
): boolean {
  const audioDurationInFrames = Math.ceil(audioDurationInSeconds * FPS);
  return currentFrame < audioDurationInFrames;
}

// 口が開いているかどうかを判定
export function isMouthOpen(
  currentFrame: number,
  audioDurationInSeconds: number,
): boolean {
  if (!isAudioPlaying(currentFrame, audioDurationInSeconds)) return false;
  return Math.floor(currentFrame / MOUTH_TOGGLE_INTERVAL) % 2 === 0;
}
