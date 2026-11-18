# WaveJSON

WaveJSON 的 Obsidian 插件（由 [TimingBench](https://github.com/udarent/TimingBench) 提供渲染内核）：在笔记里写 `wavejson` 代码块，直接看到时序图；点右上角铅笔就地编辑，退出时写回代码块源码。

渲染与编辑复用 TimingBench 的内核（同一套 IR、同一套字形规则），所以你在笔记里看到的图与 [编辑器页面](https://udarent.github.io/TimingBench/editor.html) 完全一致。

本仓库只放插件外壳（代码块处理器 + 挂载 / 写回）。渲染内核不在本仓库，构建时要能读到它（见[开发](#开发)）。

## 安装

1. 取本仓库的 `manifest.json`、`main.js`、`versions.json` 三个文件（`main.js` 已打包好，运行时不需要 `node_modules`、不需要联网）。
2. 放进 vault：

   ```text
   <your-vault>/.obsidian/plugins/wavejson/
     manifest.json
     main.js
     versions.json
   ```

3. Obsidian → 设置 → 第三方插件 → 关闭安全模式 → 启用 **WaveJSON**。

## 用法

````markdown
```wavejson
{ "signal": [
  { "name": "clk", "wave": "p...." },
  { "name": "bus", "wave": "x.34.", "data": ["head", "body"] }
] }
```
````

- **预览**：默认只显示波形，不占编辑按钮条；鼠标移到卡片上才出现右上角铅笔。
- **编辑**：点铅笔进入编辑（只波形）。改完点对勾或按 `Esc` 退出，源码写回代码块。
- **切源码**：编辑态按顶栏 `{ }` 可在「只波形 / 波形 + 源码」之间切。
- **缩放**：`Ctrl` / `⌘` + 滚轮（触控板捏合同一条路）。
- **解析失败**：卡片底部给一行红字英文提示（`Draft: …`），波形区留空；改对之后提示自动消失，原文一个字都不会丢。
- **非法字符不报错**：`wave` 里不在字表（`0 1 x z u d p P n N h l H L = 2…9`）内的字符会被当成空槽静默忽略，照常出图 —— 这是内核的容错口径，不是缺陷。

## 已知限制

- 只在**退出编辑**时写回。编辑途中切走笔记，本次改动不会保留 —— 这是为了避免「写入 → Obsidian 重渲染代码块 → 编辑器被销毁」的循环。
- 编辑态固定高度 `min(72vh, 560px)`；预览态按内容高度自适应。
- 图宽度跟随代码块宽度等比缩放，不做横向滚动。

## 开发

**先准备内核**：构建读的是 `../TimingBench/src/`，所以要把内核仓库 clone 到本仓库**旁边**（同级目录）：

```text
<workspace>/
  TimingBench/          # https://github.com/udarent/TimingBench
  obsidian-plugins-wavejson/   # 本仓库
```

```bash
npm install
npm run build     # 生成 main.js 与 src/_tb-styles.js
npm run dev       # 监听改动（改完在 Obsidian 里 Ctrl+R 重载插件）
```

构建做两件事：

1. 把 `../TimingBench/src/styles.css` 做作用域转换（`:root` → `:host`、`body` → `.tb-root`），与 `src/plugin.css` 合并成一段字符串注入 shadow root —— 所以插件样式既不会污染 Obsidian，也不受 Obsidian 主题样式表干扰。
2. 用 esbuild 把 `../TimingBench/src/editor/index.js` 及其依赖打进 `main.js`（`obsidian` 作为 external）。

`main.js` 是**提交进仓库**的构建产物：用户拿到的就是它，不需要自己构建。
当前这份由 TimingBench **v0.25.0** 内核构建 —— 内核改了而 `main.js` 没重建，插件就落后于站点，改内核后记得跑一次 `npm run build`。

`npm run sync` 把产物复制到 `../test-vault/.obsidian/plugins/wavejson/`（TimingBench 工作区里的测试仓库）；
本仓库单独 clone 时没有这个目录，sync 会失败 —— 那是给「两仓库并排」的开发环境用的，不影响构建。

> 主站交付物仍是「零构建」的多文件静态站点；这里的构建只服务于插件这一分发形态。

## 目录

```text
manifest.json        插件清单（id / version / minAppVersion）
versions.json        Obsidian 版本兼容表
main.js              构建产物（提交进仓库，装插件就是拿它）
styles.css           占位：样式全部注入 shadow root
src/main.js          插件入口：代码块处理器 + 挂载 / 切态 / 写回
src/plugin.css       插件专属样式（预览态、铅笔、编辑态高度、错误条）
esbuild.config.mjs   构建脚本（含 CSS 作用域转换）
sync.mjs             把构建产物复制进测试 vault（两仓库并排时用）
version-bump.mjs     npm version 时同步 manifest.json / versions.json
.github/workflows/   打 tag 自动发 release（校验版本一致 → 语法自检 → 上传三件套）
```

## 发布（维护者）

```bash
npm run build                 # 内核改过就必须重跑，main.js 要一起提交
git add main.js

npm version patch             # 触发 version-bump：同步 manifest / versions 并打 tag
git push && git push --tags   # tag 触发 CI：校验版本一致 + node --check + 建 release
```

CI 不会重新构建（它读不到同级目录的内核源码），发布的是仓库里那份 `main.js` —— 所以
`npm run build` 后忘了提交，release 资产就会落后于源码。

## 许可

MIT © udarent。变更记录见 [CHANGELOG.md](CHANGELOG.md)；
渲染内核来自 [TimingBench](https://github.com/udarent/TimingBench)（同为 MIT）。
