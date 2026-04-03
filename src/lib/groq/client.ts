import Groq from 'groq-sdk';
import type { CategoryRule } from '@/types';

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

function buildCategoryInstructions(categoryRules?: CategoryRule[]) {
  if (categoryRules && categoryRules.length > 0) {
    const rulesText = categoryRules
      .map((r) => {
        let line = `If description contains "${r.keyword}" → category: "${r.category}"`;
        if (r.subcategory) line += `, subcategory: "${r.subcategory}"`;
        if (r.disposition) line += `, disposition: "${r.disposition}"`;
        return line;
      })
      .join('\n');
    return `Use these custom category mapping rules FIRST (match by keyword in description, case-insensitive). For transactions that don't match any rule, fall back to: Food & Dining, Shopping, Transport, Utilities, Entertainment, Healthcare, Education, Travel, Salary, Investment, Transfer, Other.\n\nCustom rules:\n${rulesText}`;
  }
  return `Transaction categories to use: Food & Dining, Shopping, Transport, Utilities, Entertainment, Healthcare, Education, Travel, Salary, Investment, Transfer, Other.`;
}

export async function categorizeTransactions(
  parsed: ParsedStatement,
  accountName: string,
  currency: string,
  categoryRules?: CategoryRule[]
) {
  const groq = getGroq();
  const categoryInstructions = buildCategoryInstructions(categoryRules);

  const txList = parsed.transactions.map((t, i) => ({
    idx: i,
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type,
  }));

  const prompt = `You are a financial analyst. Categorize these bank transactions and provide insights.

The transactions are pre-parsed with exact amounts — do NOT change any amounts, dates, or types.

For each transaction, assign:
- "category": one of the allowed categories
- "subcategory": a more specific label (or empty string)
- "disposition": "essential" | "discretionary" | "income" | "transfer"

Also provide up to 5 brief financial insights about spending patterns.

${categoryInstructions}

Return JSON:
{
  "categories": [
    { "idx": 0, "category": "string", "subcategory": "string", "disposition": "essential"|"discretionary"|"income"|"transfer" }
  ],
  "insights": ["string"]
}

Account: ${accountName}
Currency: ${currency}

Transactions:
${JSON.stringify(txList, null, 2)}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No response from Groq');

  const result = JSON.parse(content) as {
    categories: { idx: number; category: string; subcategory: string; disposition: string }[];
    insights: string[];
  };

  const catLookup = new Map(result.categories.map((c) => [c.idx, c]));

  const transactions = parsed.transactions.map((t, i) => {
    const cat = catLookup.get(i);
    return {
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: cat?.category ?? 'Other',
      subcategory: cat?.subcategory ?? '',
      disposition: cat?.disposition ?? (t.type === 'credit' ? 'income' : 'discretionary'),
    };
  });

  const topCatMap = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === 'debit') topCatMap.set(t.category, (topCatMap.get(t.category) ?? 0) + t.amount);
  }
  const topCategories = [...topCatMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount }));

  return {
    totalCredits: parsed.totalDeposits,
    totalDebits: parsed.totalWithdrawals,
    openingBalance: parsed.openingBalance,
    closingBalance: parsed.closingBalance,
    topCategories,
    insights: result.insights ?? [],
    transactions,
  };
}

export async function analyzeStatement(
  extractedText: string,
  accountName: string,
  currency: string,
  categoryRules?: CategoryRule[]
) {
  const groq = getGroq();
  const categoryInstructions = buildCategoryInstructions(categoryRules);

  const prompt = `You are a financial analyst assistant. Analyze the following bank statement text and extract structured financial data.

CRITICAL RULES:
- ALL number fields MUST be pre-computed numeric literals (e.g. 1026658, NOT 562 + 566 + ...)
- NEVER use arithmetic expressions — only final computed values
- Dates in the statement may be DD/MM/YYYY format — convert to YYYY-MM-DD correctly (e.g. 01/02/2025 = February 1st = 2025-02-01, NOT January 2nd)
- If the statement provides Opening Balance, Closing Balance, Total Deposits, Total Withdrawals in a header row, use those exact values

Return a JSON object with EXACTLY this structure:
{
  "totalCredits": number,
  "totalDebits": number,
  "openingBalance": number,
  "closingBalance": number,
  "topCategories": [
    { "name": "category name", "amount": number }
  ],
  "insights": [
    "insight string 1",
    "insight string 2",
    ...up to 5 insights
  ],
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "type": "credit" | "debit",
      "category": "string",
      "subcategory": "string or empty string",
      "disposition": "essential" | "discretionary" | "income" | "transfer"
    }
  ]
}

${categoryInstructions}

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
