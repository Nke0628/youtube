# CLAUDE.md

## 言語設定

- 常に日本語で会話する
- コメントも日本語で記述する
- エラーメッセージの説明も日本語で行う
- ドキュメントも日本語で生成する

## プロジェクト概要

Notion上の台本データをもとに、ずんだもんキャラクターが喋るYouTube動画をRemotionで自動生成するシステム。

## ディレクトリ構成

```
youtube/
├── public/
│   ├── backgrounds/
│   │   ├── shared/                       # 共通素材（ずんだもん画像など）
│   │   └── <タイトル>/                    # 動画ごとの背景素材（ID.拡張子）
│   └── audio/                            # 生成された音声ファイル（.gitignore対象）
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
│   └── generate-audio.ts                 # VOICEVOXで音声生成（実行前にaudioフォルダを削除）
├── data/
│   ├── <タイトル>.json                    # 取得した台本データ
│   └── <タイトル>.processed.json          # 音声生成後の処理済み台本
├── .env                                  # 環境変数（NOTION_API_KEY）
└── out/                                  # レンダリング出力先
```

## Notion台本構造

bulleted_listのネスト構造で作成する：

- レベル1: セクション名
- レベル2: セリフテキスト
- レベル3: `背景素材ID:{数字}` または `自動生成`

背景素材は `public/backgrounds/<タイトル>/` に素材IDと同名のファイルを配置。
拡張子（`.png`, `.jpg`, `.jpeg`, `.webp`, `.mp4`, `.mov`, `.webm`）を自動検索。

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

## 外部API

- **Notion API**: 台本取得。`NOTION_API_KEY`を`.env`に設定。
- **VOICEVOX API**: 音声合成（ずんだもん、speaker_id: 3）。`http://localhost:50021`で起動。

## コンポーネント仕様

- **Zundamon**: 画面右側（`right: 40px`）、高さ550px。5フレーム間隔で口パク。
- **Background**: 静止画は`<Img>`、動画は`<OffthreadVideo>`（ミュート）。自動生成はグラデーション。
- **Subtitle**: M PLUS Rounded 1c、56px、白文字+緑縁取り、フェードイン10フレーム。
- **タイミング**: 各セリフの長さ = `max(音声, 背景動画) + 0.3秒マージン`。

## 主要パッケージ

| パッケージ | 用途 |
|---|---|
| `remotion` | 動画レンダリングフレームワーク |
| `@notionhq/client` | Notion API連携 |
| `@remotion/google-fonts` | Google Fonts（M PLUS Rounded 1c） |
| `dotenv` | 環境変数読み込み |
| `tsx` | TypeScriptスクリプト実行 |
| `zod` | スキーマ定義・バリデーション |
