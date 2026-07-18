# Issue Tracker

Tracks known bugs, edge cases, usability gaps, and testing gaps in
DeckCardCreator. Update the **Status** column as work happens — this file
is meant to be edited over time, not regenerated from scratch.

**Status legend:** 🔴 Open · 🟡 In Progress · 🟢 Fixed · ⚪ Won't Fix / Deferred

## Bugs (real defects)

| # | Issue | Location | Severity | Status | Notes |
|---|-------|----------|----------|--------|-------|
| 1 | Asset storage silently exceeds `localStorage` quota (~5MB) — write fails, user thinks work saved | `src/store/useTemplateStore.ts` (`persist`) | Critical | 🟢 Fixed | Moved to IndexedDB via `idb-keyval`, with a one-time migration off the old `localStorage` key. Commit `b17820d`. |
| 2 | Undo history records every keystroke/drag pixel; no coalescing, no redo | `src/store/useTemplateStore.ts` (`pushHistory`) | Critical | 🟢 Fixed | `zundo` + a hand-rolled leading-edge debounce (`src/utils/leadingEdgeDebounce.ts`) coalesce bursts into one undo step; redo added (see #15). Commit `b17820d`. |
| 3 | Loaded template JSON isn't validated beyond a truthiness check — malformed-but-present shape crashes downstream | `src/components/TopBar/TopBar.tsx` (`handleFileChosen`) | High | 🟢 Fixed | `src/utils/templateSchema.ts` (zod) validates on load and in the persist `migrate` path. Commit `b17820d`. |
| 4 | No error boundary — any render throw white-screens the app | `src/main.tsx` | High | 🟢 Fixed | `src/components/ErrorBoundary.tsx`, wraps `<App/>`. Commit `b17820d`. |
| 5 | Manual numeric property edits (Width/Height/Font Size) aren't clamped — typing 0 or negative applies immediately | `src/components/PropertiesPanel/PropertiesPanel.tsx:90,94,227` | Medium | 🟢 Fixed | Added `clampMin` (`src/utils/units.ts`), also floors NaN/Infinity from a cleared input. Width/Height floor at 5px (matches `ElementNode.tsx` drag-resize), Font Size at 4px. |
| 6 | No `onerror` handling for images — failed/corrupt image silently never renders, no feedback | `src/utils/useHtmlImage.ts`, `src/utils/renderCard.ts` (`loadImage`) | Medium | 🔴 Open | |
| 7 | Export blocks the main thread with no cancel — large decks freeze the UI | `src/utils/pdfExport.ts` (`exportDeckPdf`) | Medium | 🔴 Open | Needs `AbortSignal` + yield point per row |
| 8 | Images re-decoded per row during export instead of cached once per asset | `src/utils/renderCard.ts` (`renderCardToDataUrl`) | Medium | 🔴 Open | Pass a shared decode cache keyed by dataUrl |
| 9 | No persist `version`/`migrate` — future `Template` shape changes will break old `localStorage` data | `src/store/useTemplateStore.ts` (`persist` config) | Medium | 🟢 Fixed | `version: 1` + zod-validating `migrate`, folded into the #1 storage change. Commit `b17820d`. |
| 10 | `getAssetByName` duplicate-filename ambiguity + no missing-asset warning before export | `src/store/useTemplateStore.ts` (`getAssetByName`) | Medium | 🔴 Open | Add preflight scan in `ExportPanel` |

## Smaller edge cases

| # | Issue | Location | Severity | Status | Notes |
|---|-------|----------|----------|--------|-------|
| 11 | `a.click()` on a detached `<a>` — flaky in Safari historically | `src/utils/downloadFile.ts` | Low | 🔴 Open | Append to DOM, click, then remove |
| 12 | Body cursor/userSelect could get stuck if handle unmounts mid-drag | `src/components/ResizeHandle/ResizeHandle.tsx` | Low | ⚪ Deferred | Not currently reachable — panels never unmount |
| 13 | Restored panel size from `localStorage` isn't re-clamped to current min/max constants | `src/hooks/useResizablePanel.ts` | Low | 🔴 Open | |

## Usability gaps

| # | Issue | Location | Severity | Status | Notes |
|---|-------|----------|----------|--------|-------|
| 14 | No Delete/Backspace to remove selection, no Ctrl+D duplicate, no copy/paste | `src/components/CanvasEditor/CanvasStage.tsx` (keydown handler) | Medium | 🔴 Open | |
| 15 | No redo | same as #2 | Medium | 🟢 Fixed | Ctrl+Shift+Z / Ctrl+Y, plus a Redo button in `TopBar.tsx`. Commit `b17820d`. |
| 16 | No print bleed, crop marks, or safe-zone guide | `src/utils/renderCard.ts`, `src/utils/pdfExport.ts` | High (domain-critical) | 🔴 Open | |
| 17 | No warning when card + margins exceed usable page area (silent overflow) | `src/utils/pdfExport.ts` (`computePageLayout`) | Medium | 🔴 Open | `computePageLayout` already extracted/testable — add the check there |
| 18 | Icon-only buttons have `title` but no `aria-label` | `PropertiesPanel.tsx`, `LayersPanel.tsx` | Low | 🔴 Open | |
| 19 | Layer list items aren't keyboard-focusable/operable | `src/components/LayersPanel/LayersPanel.tsx` | Low | 🔴 Open | |

## Testing gaps

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 20 | No coverage for `renderCard.ts`/Konva rendering, no component tests | 🔴 Open | Persist migration itself is now covered (Playwright, not a vitest test — see commit `b17820d`); Konva rendering and component tests still open |

## Completed — AI development harness

Not bugs in the app itself; tracked here for history since they came out of
the same review.

| Item | Status | Commit |
|------|--------|--------|
| git repository initialized | 🟢 Fixed | `f3916fc` |
| TypeScript `strict` + `noUncheckedIndexedAccess` enabled, fallout fixed | 🟢 Fixed | `5d21982` |
| oxlint strengthened (correctness/suspicious categories) | 🟢 Fixed | `5d21982` |
| Vitest added — units, PDF grid math, Excel parsing, store reducers (24 tests) | 🟢 Fixed | `5d21982` |
| `CLAUDE.md` (commands, architecture, invariants, workflow) | 🟢 Fixed | `97c0d5c` |
| Non-blocking oxlint `PostToolUse` hook + permissions allowlist | 🟢 Fixed | `97c0d5c` |
| `verify` skill + `test/fixtures/` sample data | 🟢 Fixed | `9fa9d33` |
| `invariant-reviewer` custom agent | 🟢 Fixed | `0e10b33` |
