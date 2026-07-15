import * as XLSX from 'xlsx';
import type { DataSheet } from '../types';

export async function parseExcelFile(file: File): Promise<DataSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
  const rows = rawRows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value)])),
  );

  return { columns, rows };
}
