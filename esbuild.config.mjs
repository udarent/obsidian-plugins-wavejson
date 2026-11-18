// Build: bundle the site's renderer core into an Obsidian plugin (single-file main.js).
//
// Why a build step at all: Obsidian loads exactly one CommonJS main.js and cannot import
// ES modules out of the vault. esbuild bundles TimingBench/src into that file, so the
// installed plugin has no external runtime dependency. This does not contradict the site's
// "no build" rule — that rule governs the published site; the plugin is a second format.
import fs from "fs";
import path from "path";
import esbuild from "esbuild";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const ROOT = path.resolve(here, "..");
const MAIN_CSS = path.join(ROOT, "TimingBench", "src", "styles.css");
const PLUGIN_CSS = path.join(here, "src", "plugin.css");
const GEN = path.join(here, "src", "_tb-styles.js");

// The site stylesheet is written for a whole page: `:root` variables and the `body`
// layout have to move into the shadow root.
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
