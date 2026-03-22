import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type {
  VideoScript,
  ProcessedVideoScript,
  ProcessedSection,
  ProcessedDialogueLine,
} from "../src/types/script";

const VOICEVOX_URL = process.env.VOICEVOX_URL ?? "http://localhost:50021";
const SPEAKER_ID = 3; // ずんだもん（ノーマル）
const FPS = 30;
const MARGIN_SECONDS = 0.3;

// コマンドライン引数から台本JSONファイルのパスを取得
const scriptFile = process.argv[2];
if (!scriptFile) {
  console.error("使い方: npm run generate-audio -- data/<タイトル>.json");
  process.exit(1);
}

// WAVファイルの長さを取得（秒）
function getAudioDuration(filePath: string): number {
  const buffer = fs.readFileSync(filePath);
  // WAVヘッダーからサンプルレートとデータサイズを読み取り
  const sampleRate = buffer.readUInt32LE(24);
  const byteRate = buffer.readUInt32LE(28);
  // "data"チャンクを検索
  let dataSize = 0;
  for (let i = 0; i < buffer.length - 4; i++) {
    if (buffer.toString("ascii", i, i + 4) === "data") {
      dataSize = buffer.readUInt32LE(i + 4);
      break;
    }
  }
  return dataSize / byteRate;
}

// 動画ファイルの長さを取得（秒）- ffprobeを使用
function getVideoDuration(filePath: string): number {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: "utf-8" }
    );
    return parseFloat(result.trim());
  } catch {
    console.warn(`警告: 動画の長さを取得できませんでした: ${filePath}`);
    return 0;
  }
}

// VOICEVOXで音声合成
async function synthesize(text: string, outputPath: string): Promise<void> {
  // 音声クエリ作成
  const queryRes = await fetch(
    `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${SPEAKER_ID}`,
    { method: "POST" }
  );
  if (!queryRes.ok) {
    throw new Error(`音声クエリ作成失敗: ${queryRes.status} ${await queryRes.text()}`);
  }
  const query = await queryRes.json() as Record<string, unknown>;
  query.speedScale = 1.15;

  // 音声合成
  const synthRes = await fetch(
    `${VOICEVOX_URL}/synthesis?speaker=${SPEAKER_ID}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    }
  );
  if (!synthRes.ok) {
    throw new Error(`音声合成失敗: ${synthRes.status} ${await synthRes.text()}`);
  }

  const buffer = Buffer.from(await synthRes.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

async function main() {
  const scriptPath = path.resolve(scriptFile);
  if (!fs.existsSync(scriptPath)) {
    console.error(`台本ファイルが見つかりません: ${scriptPath}`);
    process.exit(1);
  }

  const script: VideoScript = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));
  const { title } = script;

  // 音声出力ディレクトリ（既存ファイルを削除して再作成）
  const audioDir = path.resolve(__dirname, `../public/audio/${title}`);
  if (fs.existsSync(audioDir)) {
    fs.rmSync(audioDir, { recursive: true });
    console.log(`既存の音声ファイルを削除しました: ${audioDir}`);
  }
  fs.mkdirSync(audioDir, { recursive: true });

  const processedSections: ProcessedSection[] = [];
  let totalFrames = 0;

  for (let si = 0; si < script.sections.length; si++) {
    const section = script.sections[si];
    const processedLines: ProcessedDialogueLine[] = [];

    for (let li = 0; li < section.lines.length; li++) {
      const line = section.lines[li];
      const audioFileName = `section-${si}-line-${li}.wav`;
      const audioFilePath = path.join(audioDir, audioFileName);

      console.log(`音声生成中: [${si}-${li}] ${line.text}`);
      await synthesize(line.text, audioFilePath);

      const audioDuration = getAudioDuration(audioFilePath);
      console.log(`  音声の長さ: ${audioDuration.toFixed(2)}秒`);

      let videoDuration: number | undefined;
      if (line.background.type === "video") {
        const videoPath = path.resolve(__dirname, `../public/${line.background.path}`);
        if (fs.existsSync(videoPath)) {
          videoDuration = getVideoDuration(videoPath);
          console.log(`  動画の長さ: ${videoDuration.toFixed(2)}秒`);
        }
      }

      // セリフの表示フレーム数を計算（音声基準。動画背景の延長はコンポーネント側で処理）
      const frames = Math.ceil((audioDuration + MARGIN_SECONDS) * FPS);
      totalFrames += frames;

      processedLines.push({
        ...line,
        audioFile: `audio/${title}/${audioFileName}`,
        audioDurationInSeconds: audioDuration,
        videoDurationInSeconds: videoDuration,
      });
    }

    processedSections.push({ title: section.title, lines: processedLines });
  }

  const processed: ProcessedVideoScript = {
    id: script.id,
    title: script.title,
    sections: processedSections,
    totalDurationInFrames: totalFrames,
  };

  const outputPath = path.resolve(__dirname, `../data/${title}.processed.json`);
  fs.writeFileSync(outputPath, JSON.stringify(processed, null, 2), "utf-8");
  console.log(`\n処理済み台本を保存しました: ${outputPath}`);
  console.log(`総フレーム数: ${totalFrames} (${(totalFrames / FPS).toFixed(1)}秒)`);
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
