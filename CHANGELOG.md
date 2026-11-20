# Changelog

Notable changes to the **plugin**. Changes to the rendering core live in
[TimingBench](https://github.com/udarent/TimingBench)'s own changelog.

Only user-visible behaviour is listed here; internal refactors are mentioned
only when they change what you see.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.8] - 2026-11-20

Synced with TimingBench 0.27.6 and 0.27.7.

### Changed

- **`config.hscale` widens cells without inflating the waveform band.** The band height is
  now anchored to the base cell width, so a diagram with `hscale: 2` gets wider but keeps
  its row proportions. Before, the band grew with hscale and rows looked stretched.

### Fixed

- Half a pixel of column grid could show through the wedge where an `x` block meets a
  transition. The mask now covers one extra pixel on the right edge.

## [0.1.7] - 2026-11-20

Synced with TimingBench 0.27.4 and 0.27.5.

### Changed

- **Larger text on the canvas.** Row names, bus labels and cell labels now use upstream's
  scale (14px instead of 12px), so a diagram in a note reads the same as on wavedrom.com.
  The diagram box size is unchanged — only the type inside it grew.
- **Edge geometry reworked** to match upstream. Arcs now start and stop at the midpoint of
  the transition band instead of the cell boundary, and the polyline shapes were
  re-measured, so existing `node` anchors land slightly differently.
- The waveform band height is derived from the cell width rather than a separate
  two-state switch, so hscale no longer changes the band's proportions.

### Fixed

- `x` blocks no longer let the column grid show through the hatch.
- A block feeding into `z` draws the two shallow bends upstream uses (`vmz`) instead of
  stopping dead at the cell edge.
- Several `z` / `x` / `u` / `d` transition defects found while reviewing the tutorial's
  first example.

## [0.1.6] - 2026-11-20

Synced with TimingBench 0.27.3 — two clock rendering fixes.

### Fixed

- **Stray edge arrows on level rows.** A `L.` or `H.` row used to draw an arrow in every
  continuing cell, so a low period looked like a chain of edges. The arrow now belongs to
  the edge itself: only the first cell of a level run has one. Continuous clocks such as
  `P.......` still get an arrow per cell, as upstream does.
- **Clock cells following a bus or `x` block** no longer draw a slanted cap. Upstream gives
  them a vertical rising edge (its `pclk` / `nclk` bricks), with the block cut at the cell
  boundary — the old cap left a triangular notch and shortened the level by 9px.

## [0.1.5] - 2026-11-20

Synced with TimingBench 0.27.2 — rendering fixes only, no API or layout changes.

### Fixed

- **`z` rows meeting a bus block** used to be drawn as a cross transition: the
  high-impedance line broke at the cell boundary and a spurious "X" appeared. It now
  follows upstream's `mid` entry — the line runs a few pixels into the new cell and then
  forks — so `z` slots into a block without the break.
- **`u` / `d` edges** now match upstream: the level segments are drawn as hairlines and
  the transition is a solid cubic Bézier spanning about half a cell, instead of a dashed
  cell with a short straight step.
- Fixed a path-construction bug that could emit a horizontal command with a concatenated
  coordinate and draw a line off the canvas.

## [0.1.4] - 2026-11-19

Synced with TimingBench 0.27.1.

### Changed

- **Bus and `x` rows are drawn as full-height blocks** whose transition belongs to the
  incoming cell, matching upstream WaveDrom's `vm` / `x` bricks. Transitions no longer
  look shifted half a cell to the left.
- **Bus labels are centred on the drawn block**, not on the cell midpoint, so long labels
  such as `head` / `body` sit properly inside their block.
- Hatch lines on `x` rows are clipped against the transition edges instead of running
  into the gap the transition leaves.
- Toolbar buttons now share one size (32×26 for actions, 38 wide for the view toggle);
  the period icon is a `T`.
- The split between source and diagram can be dragged (desktop editor).

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

[0.1.8]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.7...0.1.8
[0.1.7]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.6...0.1.7
[0.1.6]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.5...0.1.6
[0.1.5]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.4...0.1.5
[0.1.4]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.3...0.1.4
[0.1.3]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.2...0.1.3
[0.1.2]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/udarent/obsidian-plugins-wavejson/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/udarent/obsidian-plugins-wavejson/releases/tag/0.1.0
