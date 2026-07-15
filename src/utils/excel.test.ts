import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelFile } from './excel';

function makeXlsxFile(rows: Record<string, unknown>[], sheetName = 'Sheet1'): File {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([buffer], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function makeEmptyXlsxFile(): File {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([buffer], 'empty.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('parseExcelFile', () => {
  it('parses columns and rows from the first sheet', async () => {
    const file = makeXlsxFile([
      { name: 'Dragon', power: 7 },
      { name: 'Goblin', power: 2 },
    ]);
    const sheet = await parseExcelFile(file);

    expect(sheet.columns).toEqual(['name', 'power']);
    expect(sheet.rows).toEqual([
      { name: 'Dragon', power: '7' },
      { name: 'Goblin', power: '2' },
    ]);
  });

  it('coerces every cell value to a string', async () => {
    const file = makeXlsxFile([{ count: 42, active: true }]);
    const sheet = await parseExcelFile(file);

    expect(sheet.rows[0]).toEqual({ count: '42', active: 'true' });
  });

  it('fills missing cells using defval rather than omitting the key', async () => {
    const file = makeXlsxFile([{ name: 'Dragon', note: 'rare' }, { name: 'Goblin' }]);
    const sheet = await parseExcelFile(file);

    expect(sheet.rows[1]).toEqual({ name: 'Goblin', note: '' });
  });

  it('returns empty columns and rows for a sheet with no data', async () => {
    const file = makeEmptyXlsxFile();
    const sheet = await parseExcelFile(file);

    expect(sheet.columns).toEqual([]);
    expect(sheet.rows).toEqual([]);
  });
});
