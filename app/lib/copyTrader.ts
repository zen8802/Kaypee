import { WalletPosition, WalletSignal, MarketMatch, CopyTrade, Settings, TrackedWallet } from './types';
import { calculateKelly } from './kellyCalculator';
import { mapPolymarketToKalshi } from './marketMapper';
import { getMarkets, addSignal, addCopyTrade } from './store';

/**
 * Process a new position detected from a tracked wallet.
 * Maps to Kalshi, sizes with Kelly, and either alerts or auto-executes.
 */
export async function processNewSignal(
  wallet: TrackedWallet,
  position: WalletPosition,
  settings: Settings
): Promise<WalletSignal> {
  const walletScore = wallet.score?.composite ?? 0;

  // Try to map to Kalshi
  let kalshiMatch: MarketMatch | null = null;
  let kellySize: number | null = null;

  if (settings.claude_api_key && settings.kalshi_api_key) {
    const kalshiMarkets = getMarkets()
      .filter((m) => m.platform === 'kalshi')
      .map((m) => ({
        ticker: m.market_id,
        title: m.title,
        yes_price: m.yes_price,
        no_price: m.no_price,
      }));

    try {
      kalshiMatch = await mapPolymarketToKalshi(
        position.market_title,
        position.market_slug,
        kalshiMarkets,
        settings.claude_api_key
      );
    } catch (e) {
      console.error('Market mapping failed:', e);
    }

    // Calculate Kelly sizing if we have a match
    if (kalshiMatch) {
      const marketPrice = position.outcome === 'YES'
        ? kalshiMatch.kalshi_yes_price
        : kalshiMatch.kalshi_no_price;

      // Use wallet win rate as our estimated probability
      const estimatedProb = wallet.score?.win_rate ?? 0.5;

      const kelly = calculateKelly(
        estimatedProb,
        marketPrice,
        settings.bankroll,
        settings.kelly_fraction,
        settings.wallet_max_copy_pct
      );
      kellySize = kelly.recommended_size;
    }
  }

  const signal: WalletSignal = {
    id: `signal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    wallet_address: wallet.address,
    wallet_label: wallet.label,
    wallet_score: walletScore,
    polymarket_title: position.market_title,
    polymarket_slug: position.market_slug,
    direction: position.outcome,
    signal_price: position.avg_price,
    signal_size: position.size,
    detected_at: new Date().toISOString(),
    kalshi_match: kalshiMatch,
    kelly_size: kellySize,
    status: 'pending',
  };

  addSignal(signal);
  return signal;
}

/**
 * Execute a copy trade on Kalshi for a given signal.
 */
export async function executeCopyTrade(
  signal: WalletSignal,
  settings: Settings
): Promise<CopyTrade> {
  if (!signal.kalshi_match) {
    throw new Error('No Kalshi market match for this signal');
  }

  const match = signal.kalshi_match;
  const direction = signal.direction;
  const entryPrice = direction === 'YES' ? match.kalshi_yes_price : match.kalshi_no_price;
  const positionSize = signal.kelly_size ?? settings.bankroll * settings.wallet_max_copy_pct;

  // In production, this would call the Kalshi API to place the order
  // For now, we log the trade
  const copyTrade: CopyTrade = {
    id: `copy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    source_wallet: signal.wallet_address,
    source_wallet_label: signal.wallet_label,
    source_wallet_score: signal.wallet_score,
    polymarket_title: signal.polymarket_title,
    polymarket_slug: signal.polymarket_slug,
    poly_direction: signal.direction,
    poly_signal_price: signal.signal_price,
    kalshi_ticker: match.kalshi_ticker,
    kalshi_title: match.kalshi_title,
    kalshi_direction: direction,
    entry_price: entryPrice,
    exit_price: null,
    position_size: Math.round(positionSize * 100) / 100,
    match_confidence: match.match_confidence,
    pnl: null,
    is_correct: null,
    status: 'open',
    opened_at: new Date().toISOString(),
    closed_at: null,
  };

  addCopyTrade(copyTrade);

  // TODO: actual Kalshi API execution
  // const { placeKalshiOrder } = await import('./kalshiApi');
  // await placeKalshiOrder(settings.kalshi_api_key, settings.kalshi_api_secret, ...);

  return copyTrade;
}

/**
 * Check if a signal should auto-execute based on settings.
 */
export function shouldAutoExecute(signal: WalletSignal, settings: Settings): boolean {
  if (!settings.wallet_auto_execute) return false;
  if (signal.wallet_score < settings.wallet_min_score) return false;
  if (!signal.kalshi_match) return false;
  if (signal.kalshi_match.match_confidence === 'LOW') return false;
  return true;
}
