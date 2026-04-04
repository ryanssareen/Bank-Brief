import Groq from 'groq-sdk';

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
}

interface ParsedStatement {
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  transactions: ParsedTransaction[];
}

function getGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');
  return new Groq({ apiKey });
}

export function categorizeTransactions(
  parsed: ParsedStatement,
) {
  const transactions = parsed.transactions.map((t) => ({
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type,
    balance: t.balance,
    category: '',
    subcategory: '',
    disposition: '' as const,
  }));

  return {
    totalCredits: parsed.totalDeposits,
    totalDebits: parsed.totalWithdrawals,
    openingBalance: parsed.openingBalance,
    closingBalance: parsed.closingBalance,
    topCategories: [] as { name: string; amount: number }[],
    insights: [] as string[],
    transactions,
  };
}

export async function analyzeStatement(
  extractedText: string,
  accountName: string,
  currency: string,
) {
  const groq = getGroq();

  const prompt = `You are a financial analyst assistant. Analyze the following bank statement text and extract structured financial data.

CRITICAL RULES:
- ALL number fields MUST be pre-computed numeric literals (e.g. 1026658, NOT 562 + 566 + ...)
- NEVER use arithmetic expressions — only final computed values
- Dates in the statement may be DD/MM/YYYY format — convert to YYYY-MM-DD correctly (e.g. 01/02/2025 = February 1st = 2025-02-01, NOT January 2nd)
- If the statement provides Opening Balance, Closing Balance, Total Deposits, Total Withdrawals in a header row, use those exact values
- Set "category" and "subcategory" to empty strings for ALL transactions — do NOT categorize
- Do NOT assign a "disposition" field to transactions

Return a JSON object with EXACTLY this structure:
{
  "totalCredits": number,
  "totalDebits": number,
  "openingBalance": number,
  "closingBalance": number,
  "topCategories": [],
  "insights": [],
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "type": "credit" | "debit",
      "balance": number,
      "category": "",
      "subcategory": ""
    }
  ]
}

Account: ${accountName}
Currency: ${currency}

Bank statement text:
${extractedText}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No response from Groq');

  return JSON.parse(content);
}
