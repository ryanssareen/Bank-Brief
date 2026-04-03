import { NextRequest, NextResponse } from 'next/server';
import { analyzeStatement, categorizeTransactions } from '@/lib/groq/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { extractedText, accountName, currency, parsed } = body;

    if (!extractedText && !parsed) {
      return NextResponse.json(
        { success: false, error: 'Missing extractedText or parsed data' },
        { status: 400 }
      );
    }

    let summary;

    if (parsed?.transactions?.length) {
      summary = categorizeTransactions(parsed);
    } else {
      summary = await analyzeStatement(
        extractedText,
        accountName ?? 'Unknown',
        currency ?? 'INR',
      );
    }

    return NextResponse.json({ success: true, summary });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
