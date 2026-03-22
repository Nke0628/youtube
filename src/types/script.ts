// 背景ソース
export type BackgroundSource =
  | { type: "image"; id: string; path: string }
  | { type: "video"; id: string; path: string }
  | { type: "auto" };

// 1つのセリフ行
export interface DialogueLine {
  text: string;
  background: BackgroundSource;
}

// セクション
export interface Section {
  title: string;
  lines: DialogueLine[];
}

// 動画全体の台本
export interface VideoScript {
  id: string;
  title: string;
  sections: Section[];
}

// 音声生成後のメタデータ付きセリフ
export interface ProcessedDialogueLine extends DialogueLine {
  audioFile: string;
  audioDurationInSeconds: number;
  videoDurationInSeconds?: number;
}

// 音声生成後のセクション
export interface ProcessedSection {
  title: string;
  lines: ProcessedDialogueLine[];
}

// 音声生成後の台本
export interface ProcessedVideoScript {
  id: string;
  title: string;
  sections: ProcessedSection[];
  totalDurationInFrames: number;
}

// 背景素材マッピング
export interface BackgroundMapping {
  [id: string]: {
    type: "image" | "video";
    path: string;
  };
}
