import { NextRequest, NextResponse } from 'next/server';
import { Opportunity, PortfolioStats } from '../../lib/types';
import { calculateKelly } from '../../lib/kellyCalculator';
import { getSettings, getMarkets, getAnalyses, saveMarkets, saveAnalyses, getLastScan, setLastScan } from '../../lib/store';

export const dynamic = 'force-dynamic';

function emptyStats(bankroll: number): PortfolioStats {
  const zeroCat = { sports: 0, politics: 0, economics: 0, crypto: 0, weather: 0, other: 0 };
  const zeroAcc = Object.fromEntries(
    Object.keys(zeroCat).map((k) => [k, { correct: 0, total: 0, rate: 0 }])
  ) as PortfolioStats['accuracy_by_category'];
  return {
    total_bankroll: bankroll,
    total_pnl: 0,
    win_rate: 0,
    open_positions: 0,
    total_trades: 0,
    avg_edge_captured: 0,
    bankroll_history: [{ date: new Date().toISOString().split('T')[0], value: bankroll }],
    pnl_by_category: zeroCat,
    accuracy_by_category: zeroAcc,
  };
}

export async function GET() {
  const settings = getSettings();
  const markets = getMarkets();
  const analyses = getAnalyses();

  const opportunities: Opportunity[] = markets.map((market) => {
    const analysis = analyses.find((a) => a.market_id === market.id);
    if (!analysis) return null;

    const kelly = calculateKelly(
      analysis.predicted_probability,
      market.yes_price,
      settings.bankroll,
      settings.kelly_fraction,
      settings.max_position_pct
    );

    return {
      market,
      analysis,
      kelly_fraction: kelly.fractional_kelly,
      recommended_size: kelly.recommended_size,
      estimated_profit: kelly.estimated_profit,
    };
  }).filter((o): o is Opportunity => o !== null);

  const sorted = opportunities.sort((a, b) => b.analysis.edge_score - a.analysis.edge_score);
  const filtered = sorted.filter(
    (o) => o.analysis.edge_score >= settings.min_edge_score && o.analysis.confidence_in_rules_reading === 'HIGH'
  );

  return NextResponse.json({
    opportunities: sorted,
    filtered_opportunities: filtered,
    stats: emptyStats(settings.bankroll),
    settings,
    last_scan: getLastScan(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { claude_api_key, kalshi_api_key, kalshi_api_secret } = body;

  if (!claude_api_key) {
    return NextResponse.json({ error: 'Claude API key required. Set it in Settings.' }, { status: 400 });
  }

  const allMarkets: import('../../lib/types').Market[] = [];

  // Fetch from Polymarket (no auth needed)
  try {
    const { fetchPolymarketMarkets } = await import('../../lib/polymarketApi');
    const polyMarkets = await fetchPolymarketMarkets();
    allMarkets.push(...polyMarkets);
  } catch (e) {
    console.error('Polymarket fetch failed:', e);
  }

  // Fetch from Kalshi if credentials provided
  if (kalshi_api_key && kalshi_api_secret) {
    try {
      const { fetchKalshiMarkets } = await import('../../lib/kalshiApi');
      const kalshiMarkets = await fetchKalshiMarkets(kalshi_api_key, kalshi_api_secret);
      allMarkets.push(...kalshiMarkets);
    } catch (e) {
      console.error('Kalshi fetch failed:', e);
    }
  }

  // Analyze each market with Claude
  const newAnalyses: import('../../lib/types').Analysis[] = [];
  const { analyzeMarket } = await import('../../lib/claudeAnalyzer');

  for (const market of allMarkets.slice(0, 20)) {
    try {
      const analysis = await analyzeMarket(market, claude_api_key);
      newAnalyses.push(analysis);
    } catch (e) {
      console.error(`Analysis failed for ${market.title}:`, e);
    }
  }

  saveMarkets(allMarkets);
  saveAnalyses(newAnalyses);
  const now = new Date().toISOString();
  setLastScan(now);

  return NextResponse.json({
    markets_fetched: allMarkets.length,
    markets_analyzed: newAnalyses.length,
    last_scan: now,
  });
}
