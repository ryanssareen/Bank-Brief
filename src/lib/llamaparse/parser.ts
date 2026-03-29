import * as XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';

export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  if (fileType === 'pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  }

  if (fileType === 'csv') {
    return buffer.toString('utf-8');
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(firstSheet);
}
