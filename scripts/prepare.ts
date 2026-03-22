import "dotenv/config";
import { execSync } from "child_process";
import * as path from "path";

// コマンドライン引数からページIDを取得
const pageId = process.argv.find((arg) => arg.startsWith("--page-id="))?.split("=")[1];
if (!pageId) {
  console.error("使い方: npm run prepare -- --page-id=<notion-page-id>");
  process.exit(1);
}

const scriptsDir = __dirname;
const rootDir = path.resolve(scriptsDir, "..");

// 1. Notionから台本取得
console.log("=== 台本取得中 ===\n");
const fetchOutput = execSync(
  `npx tsx ${path.join(scriptsDir, "fetch-script.ts")} --page-id=${pageId}`,
  { cwd: rootDir, encoding: "utf-8", stdio: "pipe", env: { ...process.env } }
);
console.log(fetchOutput);

// 出力からタイトルを抽出
const titleMatch = fetchOutput.match(/タイトル: (.+)/);
if (!titleMatch) {
  console.error("タイトルの取得に失敗しました");
  process.exit(1);
}
const title = titleMatch[1].trim();
const scriptFile = path.join(rootDir, `data/${title}.json`);

// 2. 音声生成
console.log("=== 音声生成中 ===\n");
execSync(
  `npx tsx ${path.join(scriptsDir, "generate-audio.ts")} "${scriptFile}"`,
  { cwd: rootDir, encoding: "utf-8", stdio: "inherit", env: { ...process.env } }
);

console.log("\n=== 準備完了 ===");
console.log(`npm run dev でプレビュー、npm run render で動画出力できます`);
