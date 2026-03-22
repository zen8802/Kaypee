import { NextRequest, NextResponse } from 'next/server';
import { Trade } from '../../lib/types';
import { getTrades, addTrade } from '../../lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const trades = getTrades().sort(
    (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
  );

  const openTrades = trades.filter((t) => t.status === 'open');
  const closedTrades = trades.filter((t) => t.status !== 'open');

  return NextResponse.json({
    trades,
    open_trades: openTrades,
    closed_trades: closedTrades,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const trade: Trade = {
    id: `trade_${Date.now()}`,
    market_id: body.market_id,
    market_title: body.market_title,
    platform: body.platform,
    category: body.category,
    direction: body.direction,
    entry_price: body.entry_price,
    exit_price: null,
    position_size: body.position_size,
    ai_reasoning: body.ai_reasoning,
    ai_certainty: body.ai_certainty,
    ai_edge_score: body.ai_edge_score,
    pnl: null,
    is_correct: null,
    status: 'open',
    opened_at: new Date().toISOString(),
    closed_at: null,
  };

  addTrade(trade);

  return NextResponse.json({ success: true, trade });
}
