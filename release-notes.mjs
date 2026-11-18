// Extract the section for the current tag from CHANGELOG.md and write it as release notes.
//
// Usage: GITHUB_REF_NAME=0.1.0 node release-notes.mjs > NOTES.md
// Without the env var it falls back to package.json's version, so you can preview locally.
import { readFileSync, writeFileSync } from "fs";

const version = process.env.GITHUB_REF_NAME || JSON.parse(readFileSync("package.json", "utf8")).version;
const repo = process.env.GITHUB_REPOSITORY || "udarent/obsidian-plugins-wavejson";
const changelog = readFileSync("CHANGELOG.md", "utf8");

// Split on h2 headings and take the one whose version matches the tag.
// The heading may be `## 0.1.0` or the Keep a Changelog form `## [0.1.0] - 2026-11-18`.
const sections = changelog.split(/^## /m);
const versionOf = (section) => {
  const head = section.split("\n")[0].trim();
  const m = head.match(/^\[?v?(\d+\.\d+\.\d+)\]?/);
  return m ? m[1] : null;
};
const hit = sections.find((s) => versionOf(s) === version);

const parts = [];
if (hit) {
  // Drop the heading itself (the release title is already the version) and keep the body.
  const body = hit.split("\n").slice(1).join("\n").trim();
  if (body) parts.push(body);
} else {
  parts.push("This version has no dedicated entry in CHANGELOG.md.");
}
parts.push("---");
parts.push(`**Full changelog**: https://github.com/${repo}/commits/${version}`);

const out = parts.join("\n\n") + "\n";
writeFileSync("NOTES.md", out);
process.stdout.write(out);
