import { NextRequest, NextResponse } from 'next/server';
import { getWallet, upsertWallet } from '../../../lib/store';
import { fetchWalletHistory, fetchWalletPositions } from '../../../lib/polymarketWallets';
import { scoreWallet } from '../../../lib/walletScorer';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { address: string } }
) {
  const wallet = getWallet(params.address);

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  return NextResponse.json({ wallet });
}

// PATCH: refresh wallet data or toggle pause
export async function PATCH(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  const wallet = getWallet(params.address);
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  const body = await request.json();

  // Toggle pause
  if (body.paused !== undefined) {
    wallet.paused = body.paused;
    upsertWallet(wallet);
    return NextResponse.json({ success: true, wallet });
  }

  // Refresh data
  if (body.refresh) {
    try {
      const trades = await fetchWalletHistory(wallet.address);
      const positions = await fetchWalletPositions(wallet.address);
      const score = scoreWallet(trades);

      wallet.trades = trades;
      wallet.active_positions = positions;
      wallet.score = score;
      wallet.trade_count = trades.length;
      wallet.last_scanned = new Date().toISOString();

      upsertWallet(wallet);
      return NextResponse.json({ success: true, wallet });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Refresh failed' },
        { status: 500 }
      );
    }
  }

  // Update label
  if (body.label) {
    wallet.label = body.label;
    upsertWallet(wallet);
    return NextResponse.json({ success: true, wallet });
  }

  return NextResponse.json({ success: true, wallet });
}
