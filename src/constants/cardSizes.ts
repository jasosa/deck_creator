import type { CardSizePreset } from '../types';

export const CARD_SIZE_PRESETS: [CardSizePreset, ...CardSizePreset[]] = [
  { name: 'Poker (63×88mm)', widthMm: 63, heightMm: 88 },
  { name: 'Bridge (57×89mm)', widthMm: 57, heightMm: 89 },
  { name: 'Tarot (70×120mm)', widthMm: 70, heightMm: 120 },
  { name: 'Mini American (41×63mm)', widthMm: 41, heightMm: 63 },
  { name: 'Mini European (44×67mm)', widthMm: 44, heightMm: 67 },
  { name: 'Square (70×70mm)', widthMm: 70, heightMm: 70 },
  { name: 'Custom', widthMm: 63, heightMm: 88, custom: true },
];

export const PAPER_SIZES = {
  A4: { widthMm: 210, heightMm: 297 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
} satisfies Record<string, { widthMm: number; heightMm: number }>;

export const EDITOR_DPI = 96;
export const EXPORT_DPI = 300;
