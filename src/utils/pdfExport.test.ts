import { describe, expect, it } from 'vitest';
import { computePageLayout, type ExportOptions } from './pdfExport';
import { PAPER_SIZES } from '../constants/cardSizes';

const options: ExportOptions = { paperSize: 'A4', marginMm: 10, gapMm: 3 };

describe('computePageLayout', () => {
  it('fits poker cards (63x88mm) on A4 with a 10mm margin and 3mm gap', () => {
    const layout = computePageLayout(PAPER_SIZES.A4, { widthMm: 63, heightMm: 88 }, options);
    // usableW = 190, usableH = 277; (190+3)/(63+3) = 2.92 -> 2 cols; (277+3)/(88+3) = 3.07 -> 3 rows
    expect(layout.cols).toBe(2);
    expect(layout.rowsPerPage).toBe(3);
    expect(layout.perPage).toBe(6);
  });

  it('clamps to at least 1 column/row when the card is larger than the usable page area', () => {
    const layout = computePageLayout(PAPER_SIZES.A4, { widthMm: 500, heightMm: 500 }, options);
    expect(layout.cols).toBe(1);
    expect(layout.rowsPerPage).toBe(1);
    expect(layout.perPage).toBe(1);
  });

  it('positions cards left-to-right, top-to-bottom within a page', () => {
    const layout = computePageLayout(PAPER_SIZES.A4, { widthMm: 63, heightMm: 88 }, options);
    expect(layout.positionFor(0)).toEqual({ page: 0, x: 10, y: 10 });
    expect(layout.positionFor(1)).toEqual({ page: 0, x: 10 + 63 + 3, y: 10 });
    expect(layout.positionFor(2)).toEqual({ page: 0, x: 10, y: 10 + 88 + 3 });
  });

  it('wraps to a new page once perPage is exceeded', () => {
    const layout = computePageLayout(PAPER_SIZES.A4, { widthMm: 63, heightMm: 88 }, options);
    expect(layout.perPage).toBe(6);
    expect(layout.positionFor(6)).toEqual({ page: 1, x: 10, y: 10 });
    expect(layout.positionFor(7)).toEqual({ page: 1, x: 10 + 63 + 3, y: 10 });
  });

  it('supports the Letter paper size', () => {
    const letterOptions: ExportOptions = { paperSize: 'Letter', marginMm: 10, gapMm: 3 };
    const layout = computePageLayout(PAPER_SIZES.Letter, { widthMm: 63, heightMm: 88 }, letterOptions);
    expect(layout.cols).toBeGreaterThanOrEqual(1);
    expect(layout.rowsPerPage).toBeGreaterThanOrEqual(1);
  });
});
