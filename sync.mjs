// 把构建产物同步进测试 vault。
// Obsidian 只加载 vault 内的插件副本，所以每次 build 之后都要跑一次。
//
// 用法：
//   npm run sync                              # 默认 ../test-vault（与插件目录同级）
//   npm run sync -- --dest=D:/notes           # 指定 vault 根目录
//   WAVEJSON_VAULT=D:/notes npm run sync      # 同上，走环境变量
import fs from "fs";
import path from "path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const flag = process.argv.find((a) => a.startsWith("--dest="));
const vaultArg = flag ? flag.slice("--dest=".length) : process.env.WAVEJSON_VAULT;
const vaultRoot = vaultArg ? path.resolve(vaultArg) : path.resolve(here, "..", "test-vault");

if (!fs.existsSync(vaultRoot)) {
  console.error("找不到 vault：" + vaultRoot);
  console.error("默认值是仓库同级的 ../test-vault；单独 clone 本仓库时请用 --dest=<vault 路径> 指定。");
  process.exit(1);
}

const dest = path.join(vaultRoot, ".obsidian", "plugins", "wavejson");
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
