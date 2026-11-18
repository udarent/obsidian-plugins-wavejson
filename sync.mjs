// 把构建产物同步进测试 vault。
// Obsidian 只加载 vault 内的插件副本，所以每次 build 之后都要跑一次。
import fs from "fs";
import path from "path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const dest = path.resolve(here, "..", "test-vault", ".obsidian", "plugins", "wavejson");
const files = ["manifest.json", "main.js", "versions.json", "styles.css"];

fs.mkdirSync(dest, { recursive: true });

let copied = 0;
for (const f of files) {
  const src = path.join(here, f);
  if (!fs.existsSync(src)) continue;
  fs.copyFileSync(src, path.join(dest, f));
  copied++;
  console.log("  " + f);
}

const manifest = JSON.parse(fs.readFileSync(path.join(here, "manifest.json"), "utf8"));
console.log("synced " + copied + " file(s) → " + dest);
console.log("plugin: " + manifest.name + " (" + manifest.id + ") v" + manifest.version);
