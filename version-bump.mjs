import { readFileSync, writeFileSync } from "fs";

// Same job as the official sample plugin's script: when `npm version patch|minor|major`
// runs, copy the new version into manifest.json and versions.json. Without it you end up
// with a tag saying 0.2.0 while manifest.json still says 0.1.0 — which the community
// submission check rejects.
const targetVersion = process.env.npm_package_version;
if (!targetVersion) {
  console.error("version-bump: run this through `npm version …` (needs npm_package_version)");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, 2) + "\n");

console.log(`version-bump: ${targetVersion} (minAppVersion ${minAppVersion}) written to manifest.json / versions.json`);
