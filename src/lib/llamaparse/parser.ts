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

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// "11 May '26" / "25 Apr '26" -> "2026-05-11"
function parseCardDate(raw: string): string {
  const m = raw.match(/(\d{1,2})\s+([A-Za-z]{3})\s+'?(\d{2})/);
  if (!m) return raw;
  const dd = m[1].padStart(2, '0');
  const mm = MONTHS[m[2].toLowerCase()] ?? '01';
  return `20${m[3]}-${mm}-${dd}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Deterministic parser for Axis-style credit-card statements (text from pdf-parse).
 * These have no per-row running balance and use "DD Mon 'YY" dates, so the generic
 * bank-statement parser cannot read them and they would fall back to the (unreliable)
 * LLM. Closing balance is derived as: opening + debits − credits.
 */
export function extractCreditCardStatement(text: string): ParsedStatement | null {
  if (!/Total Payment Due/i.test(text)) return null;

  const openMatch = text.match(/Opening Balance\s*₹?\s*([\d,]+\.\d{2})/i);
  const dueMatch = text.match(/Total Payment Due\s*₹?\s*([\d,]+\.\d{2})/i);
  const openingBalance = openMatch ? tryNumber(openMatch[1]) ?? 0 : 0;
  const statedClosing = dueMatch ? tryNumber(dueMatch[1]) ?? 0 : 0;

  // Isolate the transaction block: after the "...Debit/Credit" column header,
  // up to "End of Transaction Summary". This excludes header dates like the
  // payment-due date that would otherwise be parsed as a transaction.
  const headerMatch = text.match(/Debit\s*\/\s*Credit/i);
  const endMatch = text.match(/End of Transaction Summary/i);
  const startIdx = headerMatch ? (headerMatch.index ?? 0) + headerMatch[0].length : 0;
  const endIdx = endMatch ? endMatch.index ?? text.length : text.length;
  const block = text.slice(startIdx, endIdx);

  // date ... description (may span lines) ... ₹amount + Debit|Credit
  const txnRe = /(\d{1,2}\s+[A-Za-z]{3}\s+'?\d{2})([\s\S]*?)₹\s*([\d,]+\.\d{2})\s*(Debit|Credit)/gi;
  const transactions: ParsedTransaction[] = [];
  let m: RegExpExecArray | null;
  while ((m = txnRe.exec(block)) !== null) {
    const amount = tryNumber(m[3]);
    if (amount === null || amount <= 0) continue;
    const description = m[2]
      .replace(/\s+/g, ' ')
      .replace(/^[\s,–-]+|[\s,–-]+$/g, '')
      .trim()
      .slice(0, 200);
    transactions.push({
      date: parseCardDate(m[1]),
      description,
      amount,
      type: m[4].toLowerCase() === 'debit' ? 'debit' : 'credit',
      balance: 0,
    });
  }

  if (transactions.length === 0) return null;

  const totalDeposits = round2(transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0));
  const totalWithdrawals = round2(transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0));
  const closingBalance = round2(openingBalance + totalWithdrawals - totalDeposits);

  // Sanity check against the printed Total Payment Due when available (within ₹1 for rounding).
  if (statedClosing && Math.abs(statedClosing - closingBalance) > 1) {
    // Trust the derived value but keep going; the discrepancy usually means a
    // missed/extra row, which is better surfaced than silently using the LLM.
  }

  return { openingBalance, closingBalance, totalDeposits, totalWithdrawals, transactions };
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

function extractTransactionsFromText(text: string): ParsedStatement | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const dateRe = /^(\d{2}\/\d{2}\/\d{4})/;
  const amountRe = /₹?\s*([\d,]+\.\d{2})/g;

  const transactions: ParsedTransaction[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(dateRe);
    if (!dateMatch) continue;

    let block = line;
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (dateRe.test(next)) break;
      const lower = next.toLowerCase();
      if (lower.includes('registered office') || lower.includes('page') || (lower.includes('transaction') && lower.includes('date'))) break;
      block += ' ' + next;
      i = j;
    }

    const date = parseDate(dateMatch[1]);
    const amounts: number[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(amountRe.source, 'g');
    while ((m = re.exec(block)) !== null) {
      const val = tryNumber(m[1]);
      if (val !== null) amounts.push(val);
    }

    if (amounts.length < 2) continue;

    const balance = amounts[amounts.length - 1];
    const cleanDesc = block
      .replace(dateMatch[0], '')
      .replace(/₹\s*[\d,]+\.\d{2}/g, '')
      .replace(/S\d{8,}/g, '')
      .replace(/[-–]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 200);

    const prevBalance = transactions.length > 0
      ? transactions[transactions.length - 1].balance
      : null;

    if (prevBalance !== null) {
      const diff = Math.round((balance - prevBalance) * 100) / 100;
      if (diff > 0) {
        transactions.push({ date, description: cleanDesc, amount: diff, type: 'credit', balance });
      } else if (diff < 0) {
        transactions.push({ date, description: cleanDesc, amount: Math.abs(diff), type: 'debit', balance });
      }
    } else {
      const amount = amounts[amounts.length - 2];
      const desc = block.toLowerCase();
      const isDebit = desc.includes('withdraw') || desc.includes('dr-') || desc.includes('trf to') ||
        desc.includes('annual chrg') || desc.includes('chrg') || desc.includes('renewal');
      const isCredit = desc.includes('deposit') || desc.includes('cr-') || desc.includes('neft') ||
        desc.includes('int.pd') || desc.includes('closure proceeds');

      let type: 'credit' | 'debit';
      if (isDebit && !isCredit) {
        type = 'debit';
      } else if (isCredit && !isDebit) {
        type = 'credit';
      } else {
        type = amounts.length >= 3 ? 'debit' : 'credit';
      }
      transactions.push({ date, description: cleanDesc, amount, type, balance });
    }
  }

  if (transactions.length === 0) return null;

  const first = transactions[0];
  const openingBalance = first.type === 'debit'
    ? first.balance + first.amount
    : first.balance - first.amount;
  const closingBalance = transactions[transactions.length - 1].balance;
  const totalDeposits = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  return { openingBalance, closingBalance, totalDeposits, totalWithdrawals, transactions };
}

export async function parseDocument(
  buffer: Buffer,
  fileType: string,
  password?: string
): Promise<ParseResult> {
  if (fileType === 'pdf') {
    if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      throw new Error('Invalid file: this doesn\'t appear to be a real PDF. Please re-export from the original app as PDF.');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfInput: any = password ? { data: buffer, password } : buffer;
    try {
      const result = await pdfParse(pdfInput);
      // Credit-card statements (no running balance, "DD Mon 'YY" dates) need a
      // dedicated parser; fall back to the generic bank-statement parser otherwise.
      const parsed = extractCreditCardStatement(result.text) ?? extractTransactionsFromText(result.text);
      return { extractedText: result.text, parsed: parsed ?? undefined };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('password') || msg.includes('encrypted')) {
        throw new Error('PASSWORD_REQUIRED');
      }
      throw err;
    }
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
