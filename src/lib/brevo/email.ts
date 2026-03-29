import { BrevoClient } from '@getbrevo/brevo';
import type { StatementSummary } from '@/types';
import { formatINR } from '@/utils/formatCurrency';

export async function sendSummaryEmail(
  recipientEmail: string,
  recipientName: string,
  accountName: string,
  summary: StatementSummary
) {
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY! });

  const topCategoriesHtml = summary.topCategories
    .slice(0, 5)
    .map((c) => `<tr><td style="padding:6px 12px">${c.name}</td><td style="padding:6px 12px;text-align:right">${formatINR(c.amount)}</td></tr>`)
    .join('');

  const insightsHtml = summary.insights
    .map((i) => `<li style="margin-bottom:4px">${i}</li>`)
    .join('');

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h1 style="color:#1B3A5C;font-size:24px;margin-bottom:8px">Bank Brief</h1>
      <h2 style="color:#64748B;font-size:16px;font-weight:normal;margin-bottom:24px">${accountName} — Statement Summary</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr style="background:#F8FAFC"><td style="padding:8px 12px;font-weight:600">Total Credits</td><td style="padding:8px 12px;text-align:right;color:#0D9488">${formatINR(summary.totalCredits)}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">Total Debits</td><td style="padding:8px 12px;text-align:right;color:#E11D48">${formatINR(summary.totalDebits)}</td></tr>
        <tr style="background:#F8FAFC"><td style="padding:8px 12px;font-weight:600">Opening Balance</td><td style="padding:8px 12px;text-align:right">${formatINR(summary.openingBalance)}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600">Closing Balance</td><td style="padding:8px 12px;text-align:right">${formatINR(summary.closingBalance)}</td></tr>
      </table>
      <h3 style="font-size:14px;color:#1B3A5C;margin-bottom:8px">Top Spending Categories</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${topCategoriesHtml}</table>
      <h3 style="font-size:14px;color:#1B3A5C;margin-bottom:8px">AI Insights</h3>
      <ul style="color:#64748B;font-size:14px;padding-left:20px;margin-bottom:24px">${insightsHtml}</ul>
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0" />
      <p style="color:#94A3B8;font-size:12px;text-align:center">Bank Brief — Your finances, simplified</p>
    </div>
  `;

  const result = await client.transactionalEmails.sendTransacEmail({
    sender: {
      name: process.env.BREVO_SENDER_NAME ?? 'Bank Brief',
      email: process.env.BREVO_SENDER_EMAIL!,
    },
    to: [{ email: recipientEmail, name: recipientName }],
    subject: `Bank Brief — ${accountName} Statement Summary`,
    htmlContent: html,
  });

  return result;
}
