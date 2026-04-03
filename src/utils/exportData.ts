import type { Transaction, StatementSummary } from '@/types';

export function exportTransactionsCSV(transactions: Transaction[], accountName: string) {
  const headers = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Subcategory', 'Disposition'];
  const rows = transactions.map((t) => [
    t.date,
    `"${t.description.replace(/"/g, '""')}"`,
    t.type === 'debit' ? `-${t.amount}` : `${t.amount}`,
    t.type,
    t.category,
    t.subcategory || '',
    t.disposition || '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `${accountName}-transactions.csv`, 'text/csv');
}

export function exportSummaryCSV(summary: StatementSummary, accountName: string) {
  const lines = [
    'Metric,Value',
    `Total Credits,${summary.totalCredits}`,
    `Total Debits,${summary.totalDebits}`,
    `Opening Balance,${summary.openingBalance}`,
    `Closing Balance,${summary.closingBalance}`,
    `Net Change,${summary.totalCredits - summary.totalDebits}`,
    '',
    'Category,Amount',
    ...summary.topCategories.map((c) => `${c.name},${c.amount}`),
    '',
    'Insights',
    ...summary.insights.map((i) => `"${i.replace(/"/g, '""')}"`),
    '',
    ...['Date,Description,Amount,Type,Category,Subcategory,Disposition'],
    ...summary.transactions.map((t) => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type === 'debit' ? `-${t.amount}` : `${t.amount}`,
      t.type,
      t.category,
      t.subcategory || '',
      t.disposition || '',
    ].join(',')),
  ];

  const csv = lines.join('\n');
  downloadFile(csv, `${accountName}-summary.csv`, 'text/csv');
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
