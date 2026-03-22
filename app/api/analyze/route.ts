import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, api_key } = body;

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  if (!api_key) {
    return NextResponse.json(
      { error: 'Claude API key required. Set it in Settings.' },
      { status: 400 }
    );
  }

  try {
    const { analyzeFromUrl } = await import('../../lib/claudeAnalyzer');
    const result = await analyzeFromUrl(url, api_key);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
