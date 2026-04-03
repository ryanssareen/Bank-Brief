import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
}

export interface ParsedStatement {
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  transactions: ParsedTransaction[];
}

export interface ParseResult {
  extractedText: string;
  parsed?: ParsedStatement;
}

function parseDate(raw: string): string {
  const parts = raw.split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return raw;
}

function tryNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '' || val === '-') return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function extractTransactionsFromSheet(sheet: XLSX.WorkSheet): ParsedStatement | null {
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  let headerRowIdx = -1;
  let dateCol = -1;
  let remarksCol = -1;
  let withdrawCol = -1;
  let depositCol = -1;
  let balanceCol = -1;

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row) continue;
    const cells = row.map((c) => String(c ?? '').toLowerCase().trim());

    for (let j = 0; j < cells.length; j++) {
      const cell = cells[j];
      if (cell.includes('transaction date') || cell === 'date' || cell === 'txn date' || cell === 'value date') {
        dateCol = j;
        headerRowIdx = i;
      }
      if (cell.includes('remarks') || cell.includes('description') || cell === 'narration' || cell === 'particulars') {
        remarksCol = j;
      }
      if (cell.includes('withdraw') || cell === 'debit') {
        withdrawCol = j;
      }
      if (cell.includes('deposit') || cell === 'credit') {
        depositCol = j;
      }
      if (cell.includes('closing balance') || cell === 'balance') {
        balanceCol = j;
      }
    }
    if (headerRowIdx !== -1) break;
  }

  if (headerRowIdx === -1 || dateCol === -1) return null;

  let openingBalance = 0;
  let closingBalance = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;

  for (let i = 0; i < headerRowIdx; i++) {
    const row = data[i] as unknown[];
    if (!row) continue;
    const cells = row.map((c) => String(c ?? '').toLowerCase().trim());
    const openIdx = cells.findIndex((c) => c.includes('opening balance'));
    if (openIdx !== -1) {
      const nextRow = data[i + 1] as unknown[];
      if (nextRow) {
        openingBalance = tryNumber(nextRow[openIdx]) ?? 0;
        totalDeposits = tryNumber(nextRow[openIdx + 1]) ?? 0;
        totalWithdrawals = tryNumber(nextRow[openIdx + 2]) ?? 0;
        closingBalance = tryNumber(nextRow[openIdx + 3]) ?? 0;
      }
    }
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    if (!row || row.every((c) => c === null || c === undefined || c === '')) continue;

    const rawDate = String(row[dateCol] ?? '').trim();
    if (!rawDate || rawDate.toLowerCase().includes('statement') || rawDate.toLowerCase().includes('registered')) break;

    const date = parseDate(rawDate);
    const description = String(row[remarksCol] ?? '').trim();
    const withdraw = withdrawCol !== -1 ? tryNumber(row[withdrawCol]) : null;
    const deposit = depositCol !== -1 ? tryNumber(row[depositCol]) : null;
    const balance = balanceCol !== -1 ? (tryNumber(row[balanceCol]) ?? 0) : 0;

    if (withdraw !== null) {
      transactions.push({ date, description, amount: withdraw, type: 'debit', balance });
    } else if (deposit !== null) {
      transactions.push({ date, description, amount: deposit, type: 'credit', balance });
    }
  }

  if (transactions.length === 0) return null;

  if (!openingBalance && transactions.length > 0) {
    const first = transactions[0];
    openingBalance = first.type === 'debit'
      ? first.balance + first.amount
      : first.balance - first.amount;
  }
  if (!closingBalance && transactions.length > 0) {
    closingBalance = transactions[transactions.length - 1].balance;
  }
  if (!totalDeposits) {
    totalDeposits = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  }
  if (!totalWithdrawals) {
    totalWithdrawals = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  }

  return { openingBalance, closingBalance, totalDeposits, totalWithdrawals, transactions };
}

export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<ParseResult> {
  if (fileType === 'pdf') {
    if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      throw new Error('Invalid file: this doesn\'t appear to be a real PDF. Please re-export from the original app as PDF.');
    }
    const result = await pdfParse(buffer);
    return { extractedText: result.text };
  }

  if (fileType === 'csv') {
    const text = buffer.toString('utf-8');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const parsed = extractTransactionsFromSheet(sheet);
    return { extractedText: text, parsed: parsed ?? undefined };
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const csvText = XLSX.utils.sheet_to_csv(sheet);
  const parsed = extractTransactionsFromSheet(sheet);
  return { extractedText: csvText, parsed: parsed ?? undefined };
}
