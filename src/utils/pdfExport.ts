import jsPDF from 'jspdf';
import { PAPER_SIZES } from '../constants/cardSizes';
import { renderCardToDataUrl } from './renderCard';
import type { DataSheet, ImageAsset, Template } from '../types';

export type ExportOptions = {
  paperSize: keyof typeof PAPER_SIZES;
  marginMm: number;
  gapMm: number;
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

  for (let i = 0; i < rows.length; i++) {
    const dataUrl = await renderCardToDataUrl(template, assets, rows[i]);
    const { page, x, y } = layout.positionFor(i);
    if (page > 0 && i % layout.perPage === 0) pdf.addPage([paper.widthMm, paper.heightMm]);
    pdf.addImage(dataUrl, 'PNG', x, y, cardW, cardH);
    onProgress?.(i + 1, rows.length);
  }

  return pdf.output('blob');
}
