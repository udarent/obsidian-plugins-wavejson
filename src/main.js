// Plugin entry: mounts the renderer/editor core into `wavejson` code blocks.
//
// Design notes
// - Rendering and editing share one core (TimingBench/src) — no second drawing path,
//   so a diagram in a note looks exactly like the same diagram on the website.
// - Shadow root isolation: the whole site stylesheet goes into the shadow, so Obsidian's
//   styles cannot leak in and ours cannot leak out.
// - Preview is read-only (scrollable, Ctrl/⌘ + wheel to zoom). The pencil switches to
//   editing; leaving editing is what writes the source back into the code block.
// - Write back *only* on exit: writing to the vault mid-edit makes Obsidian re-render the
//   code block, which destroys the editor instance and the caret with it.

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

// One code block: mounts the core, toggles read-only / editing, writes the result back.
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
      initial: this.source,
      topbar: q("topbar"),
      tbpanel: q("tbpanel"),
      tbmore: q("tbmore"),
      chardock: q("chardock"),
      charmore: q("charmore"),
      toast: q("toast"),
      root: this.rootEl
    });

    // Visible channel for parse failures: one line inside the card. The core's red dot
    // only exposes the reason via `title` (hover), which touch and keyboard users never see.
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
    // The first parse happens inside createEditor, before the callback above existed.
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

    // Clicking the diagram in preview does not enter editing: reading is the default,
    // editing goes through the pencil (same rule as the website cards).
    this.rootEl.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.editing) {
        e.preventDefault();
        this.stopEdit();
      }
    });

    // Note width changes with the sidebar, window size and split panes, and fit must be
    // recomputed each time. Width only: height is our own output, so using it as the signal
    // would feed back into itself.
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
    // On this frame the container has just been resized by CSS (preview `auto` →
    // editing `min(72vh, 560px)`), so a synchronous redraw may still read the old
    // clientWidth and freeze the canvas at the un-expanded width. Recompute next frame.
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

  // Write the edited source back into the code block. Called once, on leaving editing.
  async commit() {
    const next = this.codeEl.value;
    if (next === this.source) return;
    const info = this.mdCtx.getSectionInfo(this.hostEl);
    const file = this.plugin.app.vault.getAbstractFileByPath(this.mdCtx.sourcePath);
    if (!info || !file) {
      // No section info (e.g. an exported preview): say so instead of dropping silently.
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
        // One readable line in the card; the full stack goes to the console.
        console.error("[WaveJSON] mount failed", err);
        return;
      }
      // Let Obsidian release the listeners when the code block is re-rendered.
      mdCtx.addChild(new Cleanup(() => block.destroy()));
    });
  }
}
