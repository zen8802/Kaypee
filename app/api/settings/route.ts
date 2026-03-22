import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '../../lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const updated = saveSettings(body);
  return NextResponse.json({ success: true, settings: updated });
}
