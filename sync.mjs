// Copy the build output into a test vault.
// Obsidian only loads the plugin copy inside the vault, so run this after every build.
//
// Usage:
//   npm run sync                              # defaults to ../test-vault (next to this repo)
//   npm run sync -- --dest=D:/notes           # point at a vault root
//   WAVEJSON_VAULT=D:/notes npm run sync      # same thing, via environment variable
import fs from "fs";
import path from "path";

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const flag = process.argv.find((a) => a.startsWith("--dest="));
const vaultArg = flag ? flag.slice("--dest=".length) : process.env.WAVEJSON_VAULT;
const vaultRoot = vaultArg ? path.resolve(vaultArg) : path.resolve(here, "..", "test-vault");

if (!fs.existsSync(vaultRoot)) {
  console.error("Vault not found: " + vaultRoot);
  console.error("Default is ../test-vault next to this repo; when cloning it alone, pass --dest=<vault path>.");
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
