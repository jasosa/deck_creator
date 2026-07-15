---
name: verify
description: Verify a DeckCardCreator change actually works by driving the real app end-to-end (canvas, data binding, PDF export) rather than relying on typecheck/lint/tests alone. Use after any change touching the canvas, store, export pipeline, or panels, before considering the work done.
---

# Verify DeckCardCreator changes end-to-end

Typecheck, lint, and the unit test suite (`npm run test`) only cover pure
logic (`units`, `pdfExport`'s grid math, store reducers, Excel parsing).
None of them exercise Konva rendering, drag/transform interaction, file
upload, or the actual PDF output. This skill drives the real app to close
that gap.

## Setup

1. Start the dev server: `npm run dev` (Vite, port 5173 — see
   `.claude/launch.json` for the `dev` launch config).
2. Use the fixtures in `test/fixtures/` for deterministic input instead of
   improvising data:
   - `sample.xlsx` — a small data sheet with columns `name`, `power`,
     `art` (3 rows).
   - `dragon.png`, `goblin.png` — filenames matching the `art` column
     values, for testing `image-field` matching (case-insensitive
     filename lookup — see the invariant in `CLAUDE.md`).

## Checklist by subsystem

Only run the sections relevant to what changed — don't re-verify the whole
app for an unrelated one-line fix.

**Canvas / element editing** (`CanvasEditor/`, `useTemplateStore.ts` element actions):
- Add each element type (label, image, text-field, image-field) from the
  Toolbox.
- Drag an element; resize/rotate via the Transformer handles; confirm the
  Properties panel mm values update to match.
- Select multiple elements (shift-click), align them, nudge with arrow
  keys, undo (Ctrl+Z) back through the changes.
- Reload the page — confirm the template and assets persisted.

**Data binding** (`DataPanel`, `text-field`/`image-field` elements):
- Upload `test/fixtures/sample.xlsx`; confirm columns and rows appear.
- Bind a text-field to a column; step through preview rows (Prev/Next);
  confirm the canvas text updates per row.
- Upload `dragon.png`/`goblin.png`; bind an image-field to the `art`
  column; confirm the correct image shows per row (not a placeholder).

**Export** (`ExportPanel`, `pdfExport.ts`, `renderCard.ts`):
- Export with the sample sheet loaded; open the resulting PDF; confirm
  one card per row, correct grid placement, and image-field art matches
  the row.
- Export with no data sheet loaded; confirm a single blank-row card is
  produced.
- Try a paper size / margin / gap combination and confirm the reported
  card count and layout look right before assuming `computePageLayout`
  changes are correct — the unit tests cover the math, not the visual
  result.

**Template load/save** (`TopBar`):
- Save a template, reload the page (or open a fresh tab), load it back;
  confirm elements and assets round-trip.
- Load a deliberately malformed JSON file; confirm the app shows the
  "not a valid template" alert instead of crashing.

## Reporting

State what you actually observed (e.g. "dragged the label element, x/y in
Properties panel updated correctly, reload preserved position") — not just
"looks fine." If a fixture or step doesn't apply to the change, say so
rather than skipping silently.
