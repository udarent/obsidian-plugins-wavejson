import { readFileSync, writeFileSync } from "fs";

// 官方模板同款：`npm version patch|minor|major` 时把新版本号同步进
// manifest.json 与 versions.json，避免「tag 是 0.2.0、manifest 还写 0.1.0」这种
// 社区审核一定会打回的错位。
const targetVersion = process.env.npm_package_version;
if (!targetVersion) {
  console.error("version-bump：请通过 `npm version …` 调用（需要 npm_package_version）");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, 2) + "\n");

console.log(`version-bump：${targetVersion}（minAppVersion ${minAppVersion}）已写入 manifest.json / versions.json`);
