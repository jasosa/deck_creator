import jsPDF from 'jspdf';
import { PAPER_SIZES } from '../constants/cardSizes';
import { renderCardToDataUrl, renderCardBackToDataUrl } from './renderCard';
import type { DataSheet, ImageAsset, Template } from '../types';

export type ExportOptions = {
  paperSize: keyof typeof PAPER_SIZES;
  marginMm: number;
  gapMm: number;
  showCropMarks: boolean;
  includeBacks: boolean;
};

export type PageLayout = {
  cols: number;
  rowsPerPage: number;
  perPage: number;
  positionFor: (index: number) => { page: number; x: number; y: number };
};

export function computePageLayout(
  paper: { widthMm: number; heightMm: number },
  cardSize: { widthMm: number; heightMm: number },
  options: ExportOptions,
): PageLayout {
  const usableW = paper.widthMm - options.marginMm * 2;
  const usableH = paper.heightMm - options.marginMm * 2;
  const cols = Math.max(1, Math.floor((usableW + options.gapMm) / (cardSize.widthMm + options.gapMm)));
  const rowsPerPage = Math.max(
    1,
    Math.floor((usableH + options.gapMm) / (cardSize.heightMm + options.gapMm)),
  );
  const perPage = cols * rowsPerPage;

  return {
    cols,
    rowsPerPage,
    perPage,
    positionFor: (index: number) => {
      const posInPage = index % perPage;
      const page = Math.floor(index / perPage);
      const col = posInPage % cols;
      const rowIdx = Math.floor(posInPage / cols);
      return {
        page,
        x: options.marginMm + col * (cardSize.widthMm + options.gapMm),
        y: options.marginMm + rowIdx * (cardSize.heightMm + options.gapMm),
      };
    },
  };
}

export type CropMark = { x1: number; y1: number; x2: number; y2: number };

// Marks start this far outside the trim corner, past any printed bleed, so
// they never sit on top of bleed art — then run this much further out.
const CROP_MARK_GAP_MM = 2;
const CROP_MARK_LENGTH_MM = 4;

// Two line segments per trim corner (one horizontal, one vertical), each
// pointing away from the card. Pure function so the geometry is testable
// without going through jsPDF, same as computePageLayout above.
export function cropMarksFor(x: number, y: number, cardW: number, cardH: number, bleedMm: number): CropMark[] {
  const gap = bleedMm + CROP_MARK_GAP_MM;
  const corners: { cx: number; cy: number; dx: 1 | -1; dy: 1 | -1 }[] = [
    { cx: x, cy: y, dx: -1, dy: -1 },
    { cx: x + cardW, cy: y, dx: 1, dy: -1 },
    { cx: x, cy: y + cardH, dx: -1, dy: 1 },
    { cx: x + cardW, cy: y + cardH, dx: 1, dy: 1 },
  ];

  return corners.flatMap(({ cx, cy, dx, dy }) => [
    { x1: cx + dx * gap, y1: cy, x2: cx + dx * (gap + CROP_MARK_LENGTH_MM), y2: cy },
    { x1: cx, y1: cy + dy * gap, x2: cx, y2: cy + dy * (gap + CROP_MARK_LENGTH_MM) },
  ]);
}

// Draws one already-rendered (bleed-sized) card PNG at its trim-grid
// position, plus crop marks if enabled. Shared by the front-card loop and
// the card-back loop below so both stay pixel-aligned to the same grid.
function placeCard(
  pdf: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  cardW: number,
  cardH: number,
  bleed: number,
  showCropMarks: boolean,
) {
  // renderCardToDataUrl/renderCardBackToDataUrl rasterize the bleed-sized
  // canvas (trim + bleed on each side), so the image must be placed/sized
  // to match, keeping the trim edge aligned to the page grid.
  pdf.addImage(dataUrl, 'PNG', x - bleed, y - bleed, cardW + bleed * 2, cardH + bleed * 2);
  if (!showCropMarks) return;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.15);
  for (const mark of cropMarksFor(x, y, cardW, cardH, bleed)) {
    pdf.line(mark.x1, mark.y1, mark.x2, mark.y2);
  }
}

export async function exportDeckPdf(
  template: Template,
  assets: Record<string, ImageAsset>,
  dataSheet: DataSheet | null,
  options: ExportOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const rows: (Record<string, string> | undefined)[] =
    dataSheet && dataSheet.rows.length > 0 ? dataSheet.rows : [undefined];

  const paper = PAPER_SIZES[options.paperSize];
  const cardW = template.cardSize.widthMm;
  const cardH = template.cardSize.heightMm;

  const layout = computePageLayout(paper, template.cardSize, options);
  const pdf = new jsPDF({ unit: 'mm', format: [paper.widthMm, paper.heightMm] });
  const bleed = template.bleedMm;

  for (let i = 0; i < rows.length; i++) {
    const dataUrl = await renderCardToDataUrl(template, assets, rows[i]);
    const { page, x, y } = layout.positionFor(i);
    if (page > 0 && i % layout.perPage === 0) pdf.addPage([paper.widthMm, paper.heightMm]);
    placeCard(pdf, dataUrl, x, y, cardW, cardH, bleed, options.showCropMarks);
    onProgress?.(i + 1, rows.length);
  }

  if (options.includeBacks) {
    // The back is identical for every card (see types.ts), so it's rendered
    // once and tiled into the same grid cells the front pages used — one
    // back page per front page, same count of cards per page, so the two
    // sheets cut in register with each other.
    const backDataUrl = await renderCardBackToDataUrl(template, assets);
    const totalPages = Math.ceil(rows.length / layout.perPage);
    for (let page = 0; page < totalPages; page++) {
      pdf.addPage([paper.widthMm, paper.heightMm]);
      const cardsOnPage = Math.min(layout.perPage, rows.length - page * layout.perPage);
      for (let j = 0; j < cardsOnPage; j++) {
        const { x, y } = layout.positionFor(page * layout.perPage + j);
        placeCard(pdf, backDataUrl, x, y, cardW, cardH, bleed, options.showCropMarks);
      }
    }
  }

  return pdf.output('blob');
}
