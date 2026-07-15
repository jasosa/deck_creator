import jsPDF from 'jspdf';
import { PAPER_SIZES } from '../constants/cardSizes';
import { renderCardToDataUrl } from './renderCard';
import type { DataSheet, ImageAsset, Template } from '../types';

export type ExportOptions = {
  paperSize: keyof typeof PAPER_SIZES;
  marginMm: number;
  gapMm: number;
};

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

  const usableW = paper.widthMm - options.marginMm * 2;
  const usableH = paper.heightMm - options.marginMm * 2;
  const cols = Math.max(1, Math.floor((usableW + options.gapMm) / (cardW + options.gapMm)));
  const rowsPerPage = Math.max(1, Math.floor((usableH + options.gapMm) / (cardH + options.gapMm)));
  const perPage = cols * rowsPerPage;

  const pdf = new jsPDF({ unit: 'mm', format: [paper.widthMm, paper.heightMm] });

  for (let i = 0; i < rows.length; i++) {
    const dataUrl = await renderCardToDataUrl(template, assets, rows[i]);
    const posInPage = i % perPage;
    if (i > 0 && posInPage === 0) pdf.addPage([paper.widthMm, paper.heightMm]);
    const col = posInPage % cols;
    const rowIdx = Math.floor(posInPage / cols);
    const x = options.marginMm + col * (cardW + options.gapMm);
    const y = options.marginMm + rowIdx * (cardH + options.gapMm);
    pdf.addImage(dataUrl, 'PNG', x, y, cardW, cardH);
    onProgress?.(i + 1, rows.length);
  }

  return pdf.output('blob');
}
