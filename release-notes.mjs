// 从 CHANGELOG.md 里抽出当前 tag 对应的段落，写成 release notes。
//
// 用法：GITHUB_REF_NAME=0.1.0 node release-notes.mjs > NOTES.md
// 本地没设环境变量时读 package.json 的 version，方便预览。
import { readFileSync, writeFileSync } from "fs";

const version = process.env.GITHUB_REF_NAME || JSON.parse(readFileSync("package.json", "utf8")).version;
const repo = process.env.GITHUB_REPOSITORY || "udarent/obsidian-plugins-wavejson";
const changelog = readFileSync("CHANGELOG.md", "utf8");

// 按二级标题切段，取标题正好是这个版本号的那一段
const sections = changelog.split(/^## /m);
const hit = sections.find((s) => s.split("\n")[0].trim() === version);

const parts = [];
if (hit) {
  // 段内标题去掉（release 标题已经是版本号），保留正文
  const body = hit.split("\n").slice(1).join("\n").trim();
  if (body) parts.push(body);
} else {
  parts.push("本版本没有在 CHANGELOG.md 里单独记录。");
}
parts.push("---");
parts.push(`**完整变更**：https://github.com/${repo}/commits/${version}`);

const out = parts.join("\n\n") + "\n";
writeFileSync("NOTES.md", out);
process.stdout.write(out);
