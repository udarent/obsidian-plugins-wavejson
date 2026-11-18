// Obsidian 插件入口：把主站渲染 / 编辑内核挂到 `wavejson` 代码块里。
//
// 设计要点
// - 渲染与编辑复用同一套内核（TimingBench/src），不另写画法，保证与网站上的图一致。
// - 用 shadow root 隔离：主站 CSS 整份搬进 shadow，Obsidian 的样式进不来、我们的样式也出不去。
// - 预览态只读（可滚动、可按 Ctrl/⌘ + 滚轮缩放），点右上角铅笔进编辑，退出时把源码写回代码块。
// - 只在「退出编辑」时写回：编辑期间写 vault 会触发 Obsidian 重渲染代码块，实例被销毁、焦点丢失。

import { Plugin, Component, Notice } from "obsidian";
import { createEditor } from "../../TimingBench/src/editor/index.js";
import { TOUCH } from "../../TimingBench/src/editor/mode.js";
import CSS from "./_tb-styles.js";

const LANG = "wavejson";

const MARKUP = [
  '<div class="tb-shell">',
  '  <div class="tb-root" data-tb="root">',
  '    <header class="topbar" data-tb="topbar"></header>',
  '    <div class="app" data-tb="app">',
  '      <div class="pane src">',
  '        <div class="gutter" data-tb="gutter" aria-hidden="true"></div>',
  '        <textarea data-tb="code" spellcheck="false" wrap="off" aria-label="WaveJSON source"></textarea>',
  '        <div class="errdot" data-tb="errdot" hidden></div>',
  "      </div>",
  '      <div class="pane diagram">',
  '        <div class="svgwrap" data-tb="wrap" aria-label="Timing diagram"></div>',
  '        <div class="dockzone" data-tb="dockzone">',
  '          <div class="tbpanel" data-tb="tbpanel"></div>',
  '          <div class="tbmore" data-tb="tbmore"></div>',
  '          <div class="chardock" data-tb="chardock"></div>',
  '          <div class="charmore" data-tb="charmore"></div>',
  "        </div>",
  "      </div>",
  "    </div>",
  '    <button type="button" class="tb-toggle" data-tb="toggle" aria-label="Edit timing diagram" aria-pressed="false">',
  '      <svg class="ico-edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="M14.5 5.5l4 4"/></svg>',
  '      <svg class="ico-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l5 5L20 7"/></svg>',
  "    </button>",
  '    <div class="toast" data-tb="toast" aria-live="polite"></div>',
  '    <div class="tb-error" data-tb="err" role="status" hidden></div>',
  "  </div>",
  "</div>"
].join("\n");

class Cleanup extends Component {
  constructor(fn) {
    super();
    this.fn = fn;
  }
  onunload() {
    if (this.fn) this.fn();
    this.fn = null;
  }
}

// 一个代码块的实例：负责挂载内核、切只读 / 编辑、把结果写回笔记。
class Block {
  constructor(plugin, hostEl, mdCtx, source) {
    this.plugin = plugin;
    this.hostEl = hostEl;
    this.mdCtx = mdCtx;
    this.source = source;
    this.editing = false;
    this.ctx = null;
    this.offError = null;
    this.codeEl = null;
    this.rootEl = null;
  }

  mount() {
    const shell = document.createElement("div");
    const shadow = shell.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);

    const holder = document.createElement("div");
    holder.innerHTML = MARKUP;
    while (holder.firstChild) shadow.appendChild(holder.firstChild);

    this.hostEl.textContent = "";
    this.hostEl.appendChild(shell);

    const q = (name) => shadow.querySelector('[data-tb="' + name + '"]');
    this.rootEl = q("root");
    this.codeEl = q("code");
    if (TOUCH) this.rootEl.classList.add("is-touch");

    this.ctx = createEditor({
      code: this.codeEl,
      wrap: q("wrap"),
      gutter: q("gutter"),
      errdot: q("errdot"),
      app: q("app"),
      isEmbed: false,
      initial: this.source,
      topbar: q("topbar"),
      tbpanel: q("tbpanel"),
      tbmore: q("tbmore"),
      chardock: q("chardock"),
      charmore: q("charmore"),
      toast: q("toast"),
      root: this.rootEl
    });

    // 解析失败的可见出口：卡片里一行英文提示。内核的红点只有 hover 才出 title，
    // 触摸端与键盘完全拿不到，所以这里必须有一份常驻文字。
    const errEl = q("err");
    this.offError = this.ctx.onError((msg) => {
      if (!msg) {
        errEl.hidden = true;
        errEl.textContent = "";
        return;
      }
      errEl.textContent = msg;
      errEl.hidden = false;
    });
    // createEditor 内部的首次解析发生在回调注册之前，补读一次。
    if (this.ctx.lastError) {
      errEl.textContent = this.ctx.lastError;
      errEl.hidden = false;
    }

    this.ctx.setReadonly(true);
    this.ctx.setView("diagram");

    this.toggleEl = q("toggle");
    this.toggleEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.editing) this.stopEdit();
      else this.startEdit();
    });

    // 预览态点图不进编辑：看图为主，改图走铅笔（与网站卡片同一约定）。
    this.rootEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.editing) {
        e.preventDefault();
        this.stopEdit();
      }
    });

    // 笔记宽度会变（侧栏开合 / 窗口缩放 / 分屏），宽度一变就要重算 fit。
    // 只比宽度：高度是我们自己渲染出来的，拿它当信号会自激。
    const self = this;
    let lastW = 0;
    let raf = 0;
    this.ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : 0;
      if (!w || Math.abs(w - lastW) < 2) return;
      lastW = w;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (self.ctx) self.ctx.redraw();
      });
    });
    this.ro.observe(shell);
  }

  startEdit() {
    if (this.editing) return;
    this.editing = true;
    this.rootEl.classList.add("is-editing");
    this.toggleEl.setAttribute("aria-pressed", "true");
    this.ctx.setReadonly(false);
    this.ctx.setView("diagram");
    // 进编辑这一帧容器的宽高刚由 CSS 改过（预览态 auto → 编辑态 min(72vh,560px)），
    // 同步 redraw 读到的 clientWidth 可能还是旧值，画布会按「未撑开的宽度」定格。
    // 下一帧再算一次，让图按真实宽度重排。
    const ctx = this.ctx;
    requestAnimationFrame(() => {
      if (this.ctx === ctx && this.editing) ctx.redraw();
    });
    this.codeEl.focus();
  }

  stopEdit() {
    if (!this.editing) return;
    this.editing = false;
    this.rootEl.classList.remove("is-editing");
    this.toggleEl.setAttribute("aria-pressed", "false");
    this.ctx.setReadonly(true);
    this.ctx.setView("diagram");
    this.commit();
  }

  // 把编辑结果写回代码块。只在退出编辑时调用一次。
  async commit() {
    const next = this.codeEl.value;
    if (next === this.source) return;
    const info = this.mdCtx.getSectionInfo(this.hostEl);
    const file = this.plugin.app.vault.getAbstractFileByPath(this.mdCtx.sourcePath);
    if (!info || !file) {
      // 拿不到代码块位置（例如导出预览）：不静默丢弃，明确告知。
      new Notice("WaveJSON: cannot locate this code block to save into.");
      this.source = next;
      return;
    }
    const body = next.replace(/\s+$/, "").split("\n");
    await this.plugin.app.vault.process(file, (data) => {
      const lines = data.split("\n");
      const start = info.lineStart;
      const end = info.lineEnd;
      if (lines[start] === undefined || lines[end] === undefined) return data;
      return [].concat(lines.slice(0, start + 1), body, lines.slice(end)).join("\n");
    });
    this.source = next;
  }

  destroy() {
    if (this.ro) { try { this.ro.disconnect(); } catch (e) {} this.ro = null; }
    if (this.offError) { try { this.offError(); } catch (e) {} this.offError = null; }
    if (this.ctx && this.ctx.destroy) this.ctx.destroy();
    this.ctx = null;
  }
}

export default class WaveJSONPlugin extends Plugin {
  onload() {
    this.registerMarkdownCodeBlockProcessor(LANG, (source, el, mdCtx) => {
      const block = new Block(this, el, mdCtx, source);
      try {
        block.mount();
      } catch (err) {
        el.textContent = "WaveJSON: " + (err && err.message ? err.message : String(err));
        // 卡片里只放一行可读提示，完整栈留给控制台排障。
        console.error("[WaveJSON] mount failed", err);
        return;
      }
      // 让 Obsidian 在代码块重渲染时回收监听。
      mdCtx.addChild(new Cleanup(() => block.destroy()));
    });
  }
}
