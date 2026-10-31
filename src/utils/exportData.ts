import type { Transaction, StatementSummary, CategoryRule } from '@/types';

type Cell = string | number;

const TX_HEADERS = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Subcategory', 'Disposition', 'Balance'];

function transactionRows(transactions: Transaction[]): Cell[][] {
  return transactions.map((t) => [
    t.date,
    t.description ?? '',
    t.type === 'debit' ? -t.amount : t.amount,
    t.type,
    t.category || 'Uncategorized',
    t.subcategory || '',
    t.disposition || '',
    t.balance ?? '',
  ]);
}

interface CategoryTotal {
  category: string;
  subcategory: string;
  debits: number;
  credits: number;
  count: number;
}

/**
 * Category totals computed from every transaction, so the export covers all
 * categories (debits and credits) even when the stored topCategories list is
 * stale after edits or only covers debits.
 */
function categoryTotals(transactions: Transaction[], bySubcategory: boolean): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const t of transactions) {
    const category = t.category || 'Uncategorized';
    const subcategory = bySubcategory ? t.subcategory || '' : '';
    const key = `${category}\u0000${subcategory}`;
    const entry = map.get(key) ?? { category, subcategory, debits: 0, credits: 0, count: 0 };
    if (t.type === 'debit') entry.debits += t.amount;
    else entry.credits += t.amount;
    entry.count += 1;
    map.set(key, entry);
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return [...map.values()]
    .map((e) => ({ ...e, debits: round(e.debits), credits: round(e.credits) }))
    .sort((a, b) => b.debits - a.debits || b.credits - a.credits || a.category.localeCompare(b.category));
}

function metricRows(summary: StatementSummary): Cell[][] {
  return [
    ['Total Credits', summary.totalCredits],
    ['Total Debits', summary.totalDebits],
    ['Opening Balance', summary.openingBalance],
    ['Closing Balance', summary.closingBalance],
    ['Net Change', summary.totalCredits - summary.totalDebits],
    ['Transactions', summary.transactions?.length ?? 0],
  ];
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'export';
}

export interface StatementFileSummary {
  fileName: string;
  summary?: StatementSummary;
}

/**
 * Excel workbook with one sheet each for summary, categories, subcategories, every transaction and insights.
 * When `files` is given (the combined view of several statements), a "By File" sheet breaks the totals
 * down per uploaded statement so each file's figures stay visible alongside the combined ones.
 */
export async function exportSummaryXLSX(summary: StatementSummary, accountName: string, files?: StatementFileSummary[]) {
  const XLSX = await import('xlsx');
  const transactions = summary.transactions ?? [];
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([['Metric', 'Value'], ...metricRows(summary)]);
  summarySheet['!cols'] = [{ wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  if (files && files.length > 0) {
    const fileSheet = XLSX.utils.aoa_to_sheet([
      ['File', 'Opening Balance', 'Closing Balance', 'Total Credits', 'Total Debits', 'Net Change', 'Transactions'],
      ...files.map((f) => {
        const s = f.summary;
        return [
          f.fileName,
          s?.openingBalance ?? 0,
          s?.closingBalance ?? 0,
          s?.totalCredits ?? 0,
          s?.totalDebits ?? 0,
          (s?.totalCredits ?? 0) - (s?.totalDebits ?? 0),
          s?.transactions?.length ?? 0,
        ];
      }),
    ]);
    fileSheet['!cols'] = [{ wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 13 }];
    XLSX.utils.book_append_sheet(wb, fileSheet, 'By File');
  }

  const catSheet = XLSX.utils.aoa_to_sheet([
    ['Category', 'Debits', 'Credits', 'Transactions'],
    ...categoryTotals(transactions, false).map((c) => [c.category, c.debits, c.credits, c.count]),
  ]);
  catSheet['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 13 }];
  XLSX.utils.book_append_sheet(wb, catSheet, 'Categories');

  const subSheet = XLSX.utils.aoa_to_sheet([
    ['Category', 'Subcategory', 'Debits', 'Credits', 'Transactions'],
    ...categoryTotals(transactions, true).map((c) => [c.category, c.subcategory, c.debits, c.credits, c.count]),
  ]);
  subSheet['!cols'] = [{ wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 13 }];
  XLSX.utils.book_append_sheet(wb, subSheet, 'Subcategories');

  const txSheet = XLSX.utils.aoa_to_sheet([TX_HEADERS, ...transactionRows(transactions)]);
  txSheet['!cols'] = [{ wch: 12 }, { wch: 50 }, { wch: 14 }, { wch: 8 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }];
  if (transactions.length > 0) {
    txSheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: transactions.length, c: TX_HEADERS.length - 1 } }) };
  }
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions');

  const insightsSheet = XLSX.utils.aoa_to_sheet([['Insights'], ...(summary.insights ?? []).map((i) => [i])]);
  insightsSheet['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, insightsSheet, 'Insights');

  XLSX.writeFile(wb, `${safeName(accountName)}-summary.xlsx`);
}

const RULE_HEADERS = ['keyword', 'category', 'subcategory'];

function ruleRows(rules: CategoryRule[]): Cell[][] {
  return rules.map((r) => [r.keyword ?? '', r.category ?? '', r.subcategory ?? '']);
}

export async function exportCategoryMapXLSX(rules: CategoryRule[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([RULE_HEADERS, ...ruleRows(rules)]);
  sheet['!cols'] = [{ wch: 30 }, { wch: 24 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, sheet, 'Category Map');
  XLSX.writeFile(wb, 'category-map.xlsx');
}

/**
 * Read category rules from an Excel workbook in the layout exportCategoryMapXLSX writes
 * (header row keyword/category/subcategory). Prefers the "Category Map" sheet, else the first one.
 */
export async function parseCategoryMapXLSX(file: File): Promise<CategoryRule[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = wb.Sheets['Category Map'] ?? wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
  const cell = (v: unknown) => String(v ?? '').trim();
  const rules: CategoryRule[] = [];
  rows.forEach((row, i) => {
    const [keyword, category, subcategory] = [cell(row[0]), cell(row[1]), cell(row[2])];
    if (i === 0 && keyword.toLowerCase() === 'keyword') return;
    if (keyword && category) rules.push({ keyword, category, subcategory });
  });
  return rules;
}
