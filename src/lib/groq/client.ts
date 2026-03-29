import Groq from 'groq-sdk';

export async function analyzeStatement(
  extractedText: string,
  accountName: string,
  currency: string
) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');
  const groq = new Groq({ apiKey });
  const prompt = `You are a financial analyst assistant. Analyze the following bank statement text and extract structured financial data.

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
      "category": "string"
    }
  ]
}

Transaction categories to use: Food & Dining, Shopping, Transport, Utilities, Entertainment, Healthcare, Education, Travel, Salary, Investment, Transfer, Other.

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
