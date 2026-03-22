import { Client } from "@notionhq/client";
import * as fs from "fs";
import * as path from "path";
import type {
  VideoScript,
  DialogueLine,
  Section,
  BackgroundSource,
} from "../src/types/script";

// コマンドライン引数からページIDを取得
const pageId = process.argv.find((arg) => arg.startsWith("--page-id="))?.split("=")[1];
if (!pageId) {
  console.error("使い方: npx tsx scripts/fetch-script.ts --page-id=<notion-page-id>");
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// 対応する拡張子
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];
const VIDEO_EXTS = [".mp4", ".mov", ".webm"];

// 背景素材IDからファイルを自動検索
// public/backgrounds/<タイトル>/<ID>.{png,jpg,mov,mp4,...} を探す
function resolveBackground(title: string, id: string): BackgroundSource {
  const bgDir = path.resolve(__dirname, `../public/backgrounds/${title}`);
  const allExts = [...IMAGE_EXTS, ...VIDEO_EXTS];

  for (const ext of allExts) {
    const filePath = path.join(bgDir, `${id}${ext}`);
    if (fs.existsSync(filePath)) {
      const relativePath = `backgrounds/${title}/${id}${ext}`;
      const type = IMAGE_EXTS.includes(ext) ? "image" as const : "video" as const;
      console.log(`  背景素材ID:${id} → ${relativePath} (${type})`);
      return { type, id, path: relativePath };
    }
  }

  console.warn(`  警告: 背景素材ID "${id}" のファイルが見つかりません → 自動生成にフォールバック`);
  return { type: "auto" };
}

// ブロックのテキストを取得
function getBlockText(block: any): string {
  const richText = block[block.type]?.rich_text;
  if (!richText) return "";
  return richText.map((t: any) => t.plain_text).join("");
}

// 背景素材テキストをパース
function parseBackground(text: string, title: string): BackgroundSource {
  const trimmed = text.trim();

  // "背景素材ID:X" パターン
  const idMatch = trimmed.match(/^背景素材ID[:：](\S+)$/);
  if (idMatch) {
    return resolveBackground(title, idMatch[1]);
  }

  // "自動生成"
  if (trimmed === "自動生成") {
    return { type: "auto" };
  }

  console.warn(`  警告: 不明な背景指定 "${trimmed}" → 自動生成にフォールバック`);
  return { type: "auto" };
}

// 子ブロックを再帰的に取得
async function getChildren(blockId: string): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

async function main() {
  // ページ情報を取得
  const page = await notion.pages.retrieve({ page_id: pageId });
  const titleProp = (page as any).properties?.title ?? (page as any).properties?.Name;
  const title = titleProp?.title?.[0]?.plain_text ?? "無題の動画";

  console.log(`タイトル: ${title}`);

  // レベル1ブロック（セクション）を取得
  const topBlocks = await getChildren(pageId);

  const sections: Section[] = [];

  for (const sectionBlock of topBlocks) {
    if (sectionBlock.type !== "bulleted_list_item") continue;

    const sectionTitle = getBlockText(sectionBlock);
    if (!sectionTitle) continue;

    console.log(`\nセクション: ${sectionTitle}`);

    // レベル2ブロック（セリフ）を取得
    const lineBlocks = await getChildren(sectionBlock.id);
    const lines: DialogueLine[] = [];
    let lastBackground: BackgroundSource = { type: "auto" };

    for (const lineBlock of lineBlocks) {
      if (lineBlock.type !== "bulleted_list_item") continue;

      const text = getBlockText(lineBlock);
      if (!text) continue;

      console.log(`  セリフ: ${text}`);

      // レベル3ブロック（背景指定）を取得
      const bgBlocks = await getChildren(lineBlock.id);
      let background: BackgroundSource | null = null;

      for (const bgBlock of bgBlocks) {
        if (bgBlock.type !== "bulleted_list_item") continue;
        const bgText = getBlockText(bgBlock);
        if (bgText) {
          background = parseBackground(bgText, title);
          break;
        }
      }

      // 背景指定がない場合は直前のセリフの背景を引き継ぐ
      if (background) {
        lastBackground = background;
      } else {
        console.log(`    → 背景: 前のセリフから引き継ぎ`);
      }

      lines.push({ text, background: background ?? lastBackground });
    }

    if (lines.length > 0) {
      sections.push({ title: sectionTitle, lines });
    }
  }

  const script: VideoScript = {
    id: title,
    title,
    sections,
  };

  // 保存（タイトルをファイル名に使用）
  const outputPath = path.resolve(__dirname, `../data/${title}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(script, null, 2), "utf-8");
  console.log(`\n台本を保存しました: ${outputPath}`);
  console.log(`セクション数: ${sections.length}`);
  console.log(`総セリフ数: ${sections.reduce((sum, s) => sum + s.lines.length, 0)}`);
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
