# Changelog

Notable changes to the **plugin**. Changes to the rendering core live in
[TimingBench](https://github.com/udarent/TimingBench)'s own changelog.

Only user-visible behaviour is listed here; internal refactors are mentioned
only when they change what you see.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.3] - 2026-11-18

Synced with TimingBench 0.26.0, which reworked the read-only view.

### Changed

- **Read-only diagrams are more compact.** The header strip that was reserved above the
  waveform is gone, rows use the tighter row height, and the diagram scales to the width
  of the card (at most 2×; vectors stay sharp). Reading view now fits noticeably more
  content before you have to scroll.
- Dropped the `isEmbed` argument passed to the editor core. Embedding was removed upstream,
  so the option no longer exists.

## [0.1.2] - 2026-11-18

### Changed

- `manifest.json`: `authorUrl` now points at the author's profile instead of a repository.
  The community plugin scanner warns when this field links to a repo rather than a person.

## [0.1.1] - 2026-11-18

### Changed

- No functional changes. Documentation, code comments and the release workflow are now
  in English.
- Re-published so that a GitHub release matches the manifest version. The community
  submission check reported "no release matches your manifest version" for 0.1.0, even
  though the release existed and was tagged correctly.

## [0.1.0] - 2026-11-18

First release.

### Added

- Render `wavejson` code blocks in reading view: signal rows, group brackets,
  phase and period shifts, `edge` arrows, blank rows, and bus labels.
- Edit in place. The pencil in the corner turns the block into an editor with
  undo, redo, split direction, and a source/diagram toggle.
- Write back to the note when you leave editing (checkmark or `Esc`). Nothing is
  written to the vault while you type.
- Diagrams scale to the width of the note; `Ctrl`/`⌘` + scroll to zoom.
- Styles are scoped to the plugin, so your theme and the plugin never interfere.

### Error handling

- A parse failure leaves the diagram area empty and shows the parser message in
  red under the block.
- The message clears as soon as the source parses again — your source is never
  discarded.

### Known behaviours

- Characters outside the `wave` alphabet are ignored silently: `0@1` renders as
  if the `@` were not there.
- `edge` entries connect `node` anchors, not row names. A row without a `node`
  field cannot be an endpoint.
- The note is written only when editing ends. Returning to a cached tab keeps
  the uncommitted changes, and they are saved when you exit editing.

[0.1.3]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.2...0.1.3
[0.1.2]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/udarent/obsidian-plugins-wavejson/releases/tag/0.1.0
