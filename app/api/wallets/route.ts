import { NextRequest, NextResponse } from 'next/server';
import { TrackedWallet } from '../../lib/types';
import { getWallets, upsertWallet, removeWallet, getSignals } from '../../lib/store';
import { fetchWalletHistory, fetchWalletPositions } from '../../lib/polymarketWallets';
import { scoreWallet, isLikelyBot } from '../../lib/walletScorer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const wallets = getWallets();
  const signals = getSignals().filter((s) => s.status === 'pending');

  return NextResponse.json({
    wallets,
    active_alerts: signals.length,
    pending_signals: signals,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { address, label } = body;

  if (!address) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  // Check if already tracked
  const existing = getWallets().find(
    (w) => w.address.toLowerCase() === address.toLowerCase()
  );
  if (existing) {
    return NextResponse.json({ error: 'Wallet already tracked' }, { status: 400 });
  }

  // Fetch history and score
  let trades: Awaited<ReturnType<typeof fetchWalletHistory>> = [];
  let positions: Awaited<ReturnType<typeof fetchWalletPositions>> = [];
  let score: ReturnType<typeof scoreWallet> = null;
  let botWarning = false;

  try {
    trades = await fetchWalletHistory(address);
    positions = await fetchWalletPositions(address);
    botWarning = isLikelyBot(trades);
    score = scoreWallet(trades);
  } catch (e) {
    console.error('Failed to fetch wallet data:', e);
  }

  const wallet: TrackedWallet = {
    address: address.toLowerCase(),
    label: label || `Wallet ${address.slice(0, 6)}...${address.slice(-4)}`,
    added_at: new Date().toISOString(),
    paused: false,
    score,
    trade_count: trades.length,
    last_scanned: new Date().toISOString(),
    trades,
    active_positions: positions,
  };

  upsertWallet(wallet);

  return NextResponse.json({
    success: true,
    wallet,
    bot_warning: botWarning,
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }
  removeWallet(address);
  return NextResponse.json({ success: true });
}
