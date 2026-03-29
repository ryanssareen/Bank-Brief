import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  if (fileType === 'pdf') {
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (fileType === 'csv') {
    return buffer.toString('utf-8');
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(firstSheet);
}
