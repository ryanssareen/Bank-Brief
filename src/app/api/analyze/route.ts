import { NextRequest, NextResponse } from 'next/server';
import { analyzeStatement } from '@/lib/groq/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { extractedText, accountName, currency, categoryRules } = body;

    if (!extractedText) {
      return NextResponse.json(
        { success: false, error: 'Missing extractedText' },
        { status: 400 }
      );
    }

    const summary = await analyzeStatement(
      extractedText,
      accountName ?? 'Unknown',
      currency ?? 'INR',
      categoryRules
    );

    return NextResponse.json({ success: true, summary });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
