// 构建：把主站渲染内核打包成 Obsidian 插件（单文件 main.js + styles.css）。
//
// 为什么插件要构建：Obsidian 插件只加载一个 CJS 的 main.js，不能按 ES module 从 vault 里
// import 主站源码。这里用 esbuild 把 TimingBench/src 打进产物，运行时不依赖外部文件 ——
// 与主站「零构建」并不冲突：零构建约束的是交付站点，插件产物是另一个分发形态。
import fs from "fs";
import path from "path";
import esbuild from "esbuild";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.resolve(here, "..");
const MAIN_CSS = path.join(ROOT, "TimingBench", "src", "styles.css");
const PLUGIN_CSS = path.join(here, "src", "plugin.css");
const GEN = path.join(here, "src", "_tb-styles.js");

// 主站 CSS 是给整页写的：:root 的变量表与 body 的布局要搬到 shadow root 里。
function scope(css) {
  return css
    .replace(/:root\{/g, ":host{")
    .replace(/html,body\{height:100%\}/g, ":host{display:block}")
    .replace(
      /body\{margin:0;background:var\(--bg\);color:var\(--ink\);font:13px\/1\.6 var\(--sans\);overflow:hidden;\s*display:flex;flex-direction:column;height:100vh;height:100dvh\}/,
      ".tb-root{margin:0;background:var(--bg);color:var(--ink);font:13px/1.6 var(--sans);" +
        "overflow:hidden;display:flex;flex-direction:column;height:100%}"
    );
}

const mainCss = scope(fs.readFileSync(MAIN_CSS, "utf8"));
const pluginCss = fs.readFileSync(PLUGIN_CSS, "utf8");
fs.writeFileSync(GEN, "export default " + JSON.stringify(mainCss + "\n" + pluginCss) + ";\n", "utf8");

const options = {
  entryPoints: [path.join(here, "src", "main.js")],
  bundle: true,
  format: "cjs",
  target: "es2019",
  platform: "browser",
  external: ["obsidian"],
  loader: { ".css": "text" },
  outfile: path.join(here, "main.js"),
  legalComments: "none",
  logLevel: "info"
};

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
