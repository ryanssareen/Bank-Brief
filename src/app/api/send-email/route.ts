import { NextRequest, NextResponse } from 'next/server';
import { sendSummaryEmail } from '@/lib/brevo/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientEmail, recipientName, accountName, summary } = body;

    if (!recipientEmail || !summary) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sendSummaryEmail(
      recipientEmail,
      recipientName ?? 'User',
      accountName ?? 'Account',
      summary
    );

    return NextResponse.json({ success: true, messageId: (result as Record<string, unknown>)?.messageId ?? null });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Email failed' },
      { status: 500 }
    );
  }
}
