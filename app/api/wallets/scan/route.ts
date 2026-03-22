import { NextResponse } from 'next/server';
import { getWallets, upsertWallet, getSettings } from '../../../lib/store';
import { fetchWalletHistory, fetchWalletPositions, detectNewPositions } from '../../../lib/polymarketWallets';
import { scoreWallet } from '../../../lib/walletScorer';
import { processNewSignal, shouldAutoExecute, executeCopyTrade } from '../../../lib/copyTrader';
import { WalletSignal } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export async function POST() {
  const settings = getSettings();
  const wallets = getWallets().filter((w) => !w.paused);

  if (wallets.length === 0) {
    return NextResponse.json({ error: 'No active wallets to scan' }, { status: 400 });
  }

  const results = {
    wallets_scanned: 0,
    new_signals: 0,
    auto_executed: 0,
    errors: 0,
    signals: [] as WalletSignal[],
  };

  for (const wallet of wallets) {
    try {
      const previousPositions = wallet.active_positions;
      const trades = await fetchWalletHistory(wallet.address);
      const currentPositions = await fetchWalletPositions(wallet.address);
      const score = scoreWallet(trades);

      // Update wallet data
      wallet.trades = trades;
      wallet.active_positions = currentPositions;
      wallet.score = score;
      wallet.trade_count = trades.length;
      wallet.last_scanned = new Date().toISOString();
      upsertWallet(wallet);

      results.wallets_scanned++;

      // Detect new positions
      const newPositions = detectNewPositions(currentPositions, previousPositions);

      // Only alert for wallets above score threshold
      const walletScore = score?.composite ?? 0;
      if (walletScore < settings.wallet_min_score) continue;

      for (const pos of newPositions) {
        const signal = await processNewSignal(wallet, pos, settings);
        results.new_signals++;
        results.signals.push(signal);

        // Auto-execute if enabled and conditions met
        if (shouldAutoExecute(signal, settings)) {
          try {
            await executeCopyTrade(signal, settings);
            results.auto_executed++;
          } catch (e) {
            console.error('Auto-execute failed:', e);
          }
        }
      }
    } catch (e) {
      console.error(`Scan failed for ${wallet.address}:`, e);
      results.errors++;
    }
  }

  return NextResponse.json(results);
}
