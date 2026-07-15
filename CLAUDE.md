# DeckCardCreator

A print-and-play deck card designer: lay out a card template (labels, images,
data-bound text/image fields), preview it against rows from an uploaded Excel
sheet, and export one PDF page per row for printing.

## Commands

```
npm run dev        # start Vite dev server (port 5173)
npm run build      # tsc -b && vite build
npm run lint       # oxlint
npm run typecheck  # tsc -b (no emit)
npm run test       # vitest run
npm run test:watch # vitest (watch mode)
```

Before considering a change done, run `typecheck`, `lint`, and `test`.

## Architecture

- **Single Zustand store**: `src/store/useTemplateStore.ts`. Holds the
  `template` (card size, background, elements), `assets` (uploaded images),
  `dataSheet` (parsed Excel rows), selection state, and undo history.
  Persisted to `localStorage` under key `deck-card-creator-template`
  (`template` + `assets` only — everything else is session-only).
- **Element model**: `src/types.ts` defines `CardElement` as a discriminated
  union (`label` | `image` | `text-field` | `image-field`) on the `type`
  field. `label`/`image` are fixed content; `text-field`/`image-field` bind to
  a data-sheet column at render/export time. `CardElementPatch` is a
  union-of-partials (not `Partial<CardElement>`) so a patch can carry any
  type-specific field regardless of the element's own type.
- **Canvas**: `src/components/CanvasEditor/` renders the template with
  react-konva (`CanvasStage.tsx` = stage/selection/keyboard, `ElementNode.tsx`
  = per-element rendering and drag/transform handlers).
- **Panels**: `src/components/{Toolbox,LayersPanel,PropertiesPanel,DataPanel,ExportPanel,TopBar}/`,
  each a thin view over the store.
- **Export**: `src/utils/renderCard.ts` rebuilds an off-DOM Konva stage per
  data row and rasterizes it to a PNG data URL; `src/utils/pdfExport.ts` tiles
  those PNGs onto PDF pages via jsPDF. `computePageLayout` in `pdfExport.ts`
  is the pure grid-math function (cols/rows/positions) — test against that,
  not the async export flow.

## Invariants (things an agent will otherwise break)

- **Two unit spaces, do not mix them.** Element geometry (`x`, `y`, `width`,
  `height`) is stored in *editor pixels at `EDITOR_DPI = 96`*
  (`src/constants/cardSizes.ts`). The UI shows/accepts millimeters via
  `mmToPx`/`pxToMm` (`src/utils/units.ts`). Export re-renders the same
  template at `EXPORT_DPI = 300` using a `pixelRatio` scale-up in
  `renderCardToDataUrl` — it does not re-run layout in different units.
- **Konva async-image redraw.** Images (background and per-element) load
  outside Konva's own load-tracking, so nothing tells the layer to repaint
  when one arrives. `CanvasStage.tsx` and `ElementNode.tsx` both call a
  synchronous `layer.draw()` (not `batchDraw()`, which defers to
  `requestAnimationFrame` and can be throttled on a backgrounded tab) in a
  `useEffect` keyed on the loaded image. Don't "simplify" this away.
- **Stuck-drag recovery.** `CanvasStage.tsx` listens for `window`'s `mouseup`
  and `blur` to force-stop any in-progress Konva drag. This is the fix for a
  real bug: if the mouse button is released outside the browser entirely, no
  DOM `mouseup` fires anywhere on the page, so Konva never learns the drag
  ended and selection breaks until reload.
- **Image-field matching.** A `text-field`/`image-field` element's `column`
  points at a data-sheet column name. For `image-field`, the *cell value* is
  matched against uploaded asset **filenames**, case-insensitively
  (`getAssetByName` in `useTemplateStore.ts`) — not by asset id.
- **Persisted shape.** The zustand `persist` middleware only saves
  `{ template, assets }`. If `Template`'s shape changes, existing
  `localStorage` data will hydrate against the new shape — add a migration
  rather than assuming a clean slate.
- **Store immutability.** All store actions return new `template`/`elements`
  objects/arrays rather than mutating in place (required for Zustand's
  shallow-equality re-renders). Follow the existing spread patterns in
  `useTemplateStore.ts`.

## Working agreements

- Prefer editing existing panels/utils over introducing new abstractions —
  each panel is a thin view over the one store; keep it that way.
- Any change to `useTemplateStore.ts`, `renderCard.ts`, or `pdfExport.ts`
  should keep or extend the corresponding test file
  (`src/store/useTemplateStore.test.ts`, `src/utils/pdfExport.test.ts`).
- Commit per logical change, not per phase of a larger task.

## AI workflow

```
non-trivial change:  plan mode → approve → implement
                      → typecheck/lint/test (run manually; add hooks over time)
                      → /code-review (project-tuned checks live in the
                        invariant-reviewer agent, .claude/agents/)
                      → /verify skill — drive the real app via `npm run dev`
                      → commit
trivial change:       implement → typecheck/lint/test → commit
```

- Use plan mode for anything touching the store, canvas, or export pipeline —
  these are where the invariants above live.
- `Explore` for open-ended codebase questions; `Plan` (plan mode) for design;
  `/code-review` before committing multi-file changes.
- When an agent gets something wrong twice, fix it here (or in a hook/agent
  definition) rather than repeating the correction in the next prompt.
