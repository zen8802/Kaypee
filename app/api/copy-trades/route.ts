import { NextRequest, NextResponse } from 'next/server';
import { getCopyTrades, getSettings, getSignals, updateSignalStatus } from '../../lib/store';
import { executeCopyTrade } from '../../lib/copyTrader';

export const dynamic = 'force-dynamic';

export async function GET() {
  const trades = getCopyTrades().sort(
    (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
  );

  const openTrades = trades.filter((t) => t.status === 'open');
  const closedTrades = trades.filter((t) => t.status !== 'open');

  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const wins = closedTrades.filter((t) => t.is_correct === true).length;
  const winRate = closedTrades.length > 0 ? wins / closedTrades.length : 0;

  return NextResponse.json({
    trades,
    open_trades: openTrades,
    closed_trades: closedTrades,
    stats: {
      total_pnl: totalPnl,
      win_rate: winRate,
      total_trades: trades.length,
      open_count: openTrades.length,
    },
  });
}

// POST: execute a copy trade from a pending signal
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { signal_id } = body;

  if (!signal_id) {
    return NextResponse.json({ error: 'signal_id required' }, { status: 400 });
  }

  const signals = getSignals();
  const signal = signals.find((s) => s.id === signal_id);

  if (!signal) {
    return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
  }

  if (signal.status !== 'pending') {
    return NextResponse.json({ error: 'Signal already processed' }, { status: 400 });
  }

  const settings = getSettings();

  try {
    const trade = await executeCopyTrade(signal, settings);
    updateSignalStatus(signal_id, 'executed');
    return NextResponse.json({ success: true, trade });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Execution failed' },
      { status: 500 }
    );
  }
}
