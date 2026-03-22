import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '../../../lib/store';
import { runDiscoveryPipeline } from '../../../lib/walletDiscovery';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const settings = getSettings();

  if (!settings.claude_api_key) {
    return NextResponse.json(
      { error: 'Claude API key required for wallet discovery. Set it in Settings.' },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const days = body.days ?? 60;
  const minTrades = body.min_trades ?? 10;
  const minVolume = body.min_volume ?? 500;
  const classifyTop = body.classify_top ?? 30;

  try {
    const candidates = await runDiscoveryPipeline(
      settings.claude_api_key,
      days,
      minTrades,
      minVolume,
      500,
      classifyTop
    );

    const informed = candidates.filter((c) => c.classification === 'human-informed');
    const bots = candidates.filter((c) => c.classification === 'bot');
    const arbs = candidates.filter((c) => c.classification === 'arb');
    const retail = candidates.filter((c) => c.classification === 'human-retail');
    const unclassified = candidates.filter((c) => c.classification === null);

    return NextResponse.json({
      total_candidates: candidates.length,
      classified: candidates.filter((c) => c.classification !== null).length,
      breakdown: {
        'human-informed': informed.length,
        'human-retail': retail.length,
        bot: bots.length,
        arb: arbs.length,
        unclassified: unclassified.length,
      },
      informed,
      all_candidates: candidates,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Discovery pipeline failed' },
      { status: 500 }
    );
  }
}
