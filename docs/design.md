# ずんだもんYouTube動画生成システム 設計書

## 概要

Notion上の台本データをもとに、ずんだもんキャラクターが喋るYouTube動画をRemotionで自動生成するシステム。

---

## システム構成図

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Notion     │────▶│  台本取得スクリプト  │────▶│  台本JSON        │
│  (台本管理)   │     │  (Notion API)     │     │  (ローカル保存)   │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  音声生成スクリプト │
                                              │  (VOICEVOX API)  │
                                              └────────┬────────┘
                                                       │
                                                       ▼
┌─────────────┐                               ┌─────────────────┐
│  背景素材    │──────────────────────────────▶│  Remotion        │
│ <タイトル>/  │                               │  動画レンダリング  │
└─────────────┘                               └────────┬────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │  out/video.mp4   │
                                              └─────────────────┘
```

---

## ディレクトリ構成

```
youtube/
├── public/
│   ├── backgrounds/
│   │   ├── shared/                       # 共通素材
│   │   │   ├── mouth_open.png            # ずんだもん口開き
│   │   │   └── mouth_close.png           # ずんだもん口閉じ
│   │   └── <タイトル>/                    # 動画タイトルごとのフォルダ
│   │       ├── 1.png                     # 背景素材ID:1
│   │       ├── 2.mov                     # 背景素材ID:2
│   │       └── ...
│   └── audio/                            # 生成された音声ファイル
│       └── <タイトル>/
│           ├── section-0-line-0.wav
│           ├── section-0-line-1.wav
│           └── ...
├── src/
│   ├── index.ts                          # エントリポイント
│   ├── Root.tsx                          # Remotionルート（processed.jsonを読み込み）
│   ├── components/
│   │   ├── ZundamonVideo.tsx             # メインコンポジション（Series連結）
│   │   ├── Zundamon.tsx                  # ずんだもんキャラクター（右側配置・口パク）
│   │   ├── DialogueLine.tsx              # セリフ＋背景＋音声の1単位
│   │   ├── Background.tsx               # 背景表示（画像/動画/自動生成切り替え）
│   │   └── Subtitle.tsx                  # 字幕（M PLUS Rounded 1c・緑縁取り白文字）
│   ├── types/
│   │   └── script.ts                     # 台本の型定義
│   └── utils/
│       └── timing.ts                     # タイミング・口パク計算
├── scripts/
│   ├── prepare.ts                        # 一括実行（台本取得→音声生成）
│   ├── fetch-script.ts                   # Notionから台本取得
│   └── generate-audio.ts                 # VOICEVOXで音声生成
├── data/
│   ├── <タイトル>.json                    # 取得した台本データ
│   └── <タイトル>.processed.json          # 音声生成後の処理済み台本
├── docs/
│   └── design.md                         # 本ドキュメント
├── .env                                  # 環境変数（NOTION_API_KEY）
└── out/                                  # レンダリング出力先
```

---

## データモデル

### Notion台本構造

Notionのページをbulleted_listのネスト構造で作成する：

```
📄 動画タイトル（Notionページ）

- テストセクション1                        ← レベル1: セクション名
    - セクション1テストです。               ← レベル2: セリフ
        - 背景素材ID:1                     ← レベル3: 背景素材の指定
    - セクション1テストです。               ← レベル2: セリフ
        - 背景素材ID:1                     ← レベル3: 背景素材の指定
- テストセクション2
    - セクション2テストです。
        - 背景素材ID:2
    - セクション2の続きです。
        - 自動生成
```

**ルール:**
- レベル1（インデントなし）: セクション名
- レベル2（インデント1段）: セリフテキスト
- レベル3（インデント2段）: `背景素材ID:{数字}` または `自動生成`

**背景素材の自動解決:**
`public/backgrounds/<タイトル>/` 配下に素材IDと同名のファイルを配置する。
対応する拡張子（`.png`, `.jpg`, `.jpeg`, `.webp`, `.mp4`, `.mov`, `.webm`）を自動検索し、
画像か動画かを拡張子から判別する。

```
public/backgrounds/Claude Code 入門/
├── 1.png    ← 背景素材ID:1 → image として解決
└── 2.mov    ← 背景素材ID:2 → video として解決
```

### 台本JSONスキーマ (`types/script.ts`)

```typescript
// 背景ソース
type BackgroundSource =
  | { type: "image"; id: string; path: string }  // 静止画（IDで参照）
  | { type: "video"; id: string; path: string }  // 動画（IDで参照）
  | { type: "auto" }                              // 自動生成（将来拡張）

// 1つのセリフ行
interface DialogueLine {
  text: string;
  background: BackgroundSource;
}

// セクション
interface Section {
  title: string;
  lines: DialogueLine[];
}

// 動画全体の台本（Notionページタイトル = ID）
interface VideoScript {
  id: string;    // タイトルと同じ
  title: string;
  sections: Section[];
}

// 音声生成後のメタデータ付きセリフ
interface ProcessedDialogueLine extends DialogueLine {
  audioFile: string;
  audioDurationInSeconds: number;
  videoDurationInSeconds?: number;
}

// 音声生成後の台本
interface ProcessedVideoScript {
  id: string;
  title: string;
  sections: ProcessedSection[];
  totalDurationInFrames: number;
}
```

---

## コンポーネント設計

### 1. ZundamonVideo（メインコンポジション）

全セクション・セリフを`<Series>`で時系列に連結し、動画全体を構成する。
各セリフの長さ = `max(音声の長さ, 背景動画の長さ) + マージン` をフレーム換算。

### 2. Zundamon（キャラクター）

```
┌──────────────────────────────┐
│          背景素材             │
│                              │
│                              │
│                     ┌──────┐ │
│                     │ずんだ │ │
│                     │もん   │ │
│    ┌────────────┐   └──────┘ │
│    │   字幕      │           │
│    └────────────┘            │
└──────────────────────────────┘
```

- **配置**: 画面右側（`right: 40px`）、高さ550px
- 音声再生中：`mouth_open.png` と `mouth_close.png` を5フレーム間隔で切り替え（口パク）
- 音声停止中：`mouth_close.png` を表示

### 3. Background（背景）

- **静止画（image）**: `<Img>`で表示
- **動画（video）**: `<OffthreadVideo>`で表示（ミュート）
  - 音声 > 動画の場合：動画は最終フレームで停止
  - 動画 > 音声の場合：口パクを止めて動画を最後まで流す
- **自動生成（auto）**: グラデーション背景をフォールバック表示

### 4. Subtitle（字幕）

- フォント: M PLUS Rounded 1c（ポップな丸ゴシック）
- スタイル: 白文字 + 緑縁取り（`textShadow` + `WebkitTextStroke`）
- フォントサイズ: 56px
- フェードインアニメーション付き（10フレーム）

---

## 処理フロー

### 一括実行 (`scripts/prepare.ts`)

`npm run prepare -- --page-id=<NotionページID>` で以下を一括実行：

### Phase 1: 台本取得 (`scripts/fetch-script.ts`)

```
1. .env から NOTION_API_KEY を読み込み（dotenv）
2. Notion APIで対象ページの子ブロックを取得
3. bulleted_list_item ブロックをネストレベルで解析:
   - レベル1 → セクション名
   - レベル2（レベル1の子） → セリフテキスト
   - レベル3（レベル2の子） → 背景素材指定（"背景素材ID:X" or "自動生成"）
4. public/backgrounds/<タイトル>/ からIDに一致するファイルを自動検索
5. VideoScript型のJSONとして data/<タイトル>.json に保存
```

### Phase 2: 音声生成 (`scripts/generate-audio.ts`)

```
1. data/<タイトル>.json を読み込み
2. 各セリフに対してVOICEVOX APIで音声合成
   - キャラクター: ずんだもん（speaker_id: 3）
3. 音声ファイルを public/audio/<タイトル>/ に保存
4. 各音声の長さを計測（WAVヘッダー解析）
5. 背景が動画の場合、ffprobeで動画の長さも計測
6. ProcessedVideoScript として data/<タイトル>.processed.json に保存
```

### Phase 3: 動画レンダリング（Remotion）

```
1. Root.tsx で processed.json を import
2. 各セリフの表示時間を計算:
   - 画像背景: 音声の長さ + マージン（0.3秒）
   - 動画背景: max(音声の長さ, 動画の長さ) + マージン
3. npm run dev でプレビュー or npm run render でMP4出力
```

---

## タイミング計算ロジック

```typescript
const FPS = 30;
const MARGIN_SECONDS = 0.3;
const MOUTH_TOGGLE_INTERVAL = 5; // 5フレームごとに口を切り替え

function calculateLineDurationInFrames(line: ProcessedDialogueLine): number {
  const audioDuration = line.audioDurationInSeconds;

  if (line.background.type === "video" && line.videoDurationInSeconds) {
    const contentDuration = Math.max(audioDuration, line.videoDurationInSeconds);
    return Math.ceil((contentDuration + MARGIN_SECONDS) * FPS);
  }

  return Math.ceil((audioDuration + MARGIN_SECONDS) * FPS);
}

function isMouthOpen(frame: number, audioDurationInSeconds: number): boolean {
  const audioDurationInFrames = Math.ceil(audioDurationInSeconds * FPS);
  if (frame >= audioDurationInFrames) return false;
  return Math.floor(frame / MOUTH_TOGGLE_INTERVAL) % 2 === 0;
}
```

---

## 外部API

### Notion API

- **用途**: 台本データの取得
- **パッケージ**: `@notionhq/client`
- **必要な環境変数**: `NOTION_API_KEY`（`.env`に設定）

### VOICEVOX API

- **用途**: テキスト音声合成（ずんだもん）
- **エンドポイント**: `http://localhost:50021`（ローカル起動、`VOICEVOX_URL`で変更可）
- **話者ID**: 3（ずんだもん・ノーマル）
- **フロー**:
  1. `POST /audio_query?text={text}&speaker=3` で音声クエリ作成
  2. `POST /synthesis?speaker=3` で音声合成（WAV形式）

---

## 実行コマンド

```bash
# 一括実行（台本取得 → 音声生成）
npm run prepare -- --page-id=<NotionページID>

# 個別実行
npm run fetch-script -- --page-id=<NotionページID>
npm run generate-audio -- data/<タイトル>.json

# プレビュー
npm run dev

# レンダリング（MP4出力）
npm run render
```

---

## 主要パッケージ

| パッケージ | 用途 |
|---|---|
| `remotion` | 動画レンダリングフレームワーク |
| `@notionhq/client` | Notion API連携 |
| `@remotion/google-fonts` | Google Fonts読み込み（M PLUS Rounded 1c） |
| `@remotion/media-utils` | メディアユーティリティ |
| `dotenv` | 環境変数読み込み |
| `tsx` | TypeScriptスクリプト実行 |
| `zod` | スキーマ定義・バリデーション |

---

## 今後の拡張

- **自動生成背景**: AI画像生成APIとの連携（`type: "auto"`対応）
- **リップシンク精度向上**: 音声の振幅解析による口パク制御
- **BGM対応**: 背景音楽の自動ミキシング
- **テロップ装飾**: テキストのハイライト・アニメーション
- **複数キャラクター対応**: 掛け合い動画への拡張
