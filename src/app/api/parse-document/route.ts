import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/llamaparse/parser';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileType = formData.get('fileType') as string | null;

    if (!file || !fileType) {
      return NextResponse.json(
        { success: false, error: 'Missing file or fileType' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extractedText = await parseDocument(buffer, fileType);

    return NextResponse.json({
      success: true,
      extractedText,
      pageCount: Math.ceil(extractedText.length / 3000),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Parse failed' },
      { status: 500 }
    );
  }
}
