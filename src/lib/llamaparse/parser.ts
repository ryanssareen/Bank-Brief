import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  if (fileType === 'pdf') {
    if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      throw new Error('Invalid file: this doesn\'t appear to be a real PDF. Please re-export from the original app as PDF.');
    }
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
