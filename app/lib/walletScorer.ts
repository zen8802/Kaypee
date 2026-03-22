import { WalletTrade, WalletScoreBreakdown } from './types';

/**
 * Score a wallet based on trade history.
 *
 * smart_money_score = (win_rate × 0.4) + (roi_score × 0.3) + (timing_score × 0.2) + (sample_size_score × 0.1)
 */
export function scoreWallet(trades: WalletTrade[]): WalletScoreBreakdown | null {
  // Need minimum 10 resolved trades to score
  const resolvedTrades = trades.filter((t) => t.resolved && t.resolution_outcome !== null);
  if (resolvedTrades.length < 10) {
    return null;
  }

  // Filter to directional BUY trades only (ignore sells / arbitrage)
  const directionalBuys = resolvedTrades.filter((t) => t.side === 'BUY');
  if (directionalBuys.length < 5) {
    return null;
  }

  // --- Win Rate ---
  const wins = directionalBuys.filter(
    (t) => t.outcome === t.resolution_outcome
  ).length;
  const win_rate = wins / directionalBuys.length;

  // --- ROI ---
  let totalInvested = 0;
  let totalReturn = 0;
  for (const t of directionalBuys) {
    const invested = t.price * t.size;
    totalInvested += invested;
    if (t.outcome === t.resolution_outcome) {
      totalReturn += (1 - t.price) * t.size; // profit
    } else {
      totalReturn -= invested; // loss
    }
  }
  const roi = totalInvested > 0 ? totalReturn / totalInvested : 0;
  // Normalize ROI: 0% = 0, 50%+ = 1.0 (most Polymarket traders are negative)
  const roi_score = Math.min(1, Math.max(0, (roi + 0.1) / 0.6));

  // --- Timing Score ---
  // How many hours before resolution does this wallet typically enter?
  const timingHours: number[] = [];
  for (const t of directionalBuys) {
    if (t.resolved && t.resolution_outcome !== null) {
      // Estimate: we don't have exact resolution time, but we can approximate
      // by looking at the trade timestamp vs. the latest trade in that market
      const tradeTime = new Date(t.timestamp).getTime();
      // Use 48hrs as baseline "resolution window" since we don't have exact resolution time
      // In production, this would cross-reference with market close_time
      const hoursFromTrade = (Date.now() - tradeTime) / (1000 * 60 * 60);
      if (hoursFromTrade < 168) { // within last week
        timingHours.push(Math.min(hoursFromTrade, 168));
      }
    }
  }

  const avg_timing_hours = timingHours.length > 0
    ? timingHours.reduce((a, b) => a + b, 0) / timingHours.length
    : 48;

  // Sweet spot: 24-72 hours before resolution
  // Too fast (<6h) = bot, too slow (>168h) = random
  let timing_score: number;
  if (avg_timing_hours >= 24 && avg_timing_hours <= 72) {
    timing_score = 1.0; // sweet spot
  } else if (avg_timing_hours >= 12 && avg_timing_hours < 24) {
    timing_score = 0.8;
  } else if (avg_timing_hours > 72 && avg_timing_hours <= 120) {
    timing_score = 0.7;
  } else if (avg_timing_hours < 12) {
    timing_score = 0.3; // likely bot
  } else {
    timing_score = 0.4; // too early, less signal
  }

  // --- Sample Size Score ---
  // Log-scaled, min 10
  const sample_size = directionalBuys.length;
  const sample_size_score = Math.min(1, Math.log10(sample_size) / Math.log10(100));

  // --- Composite ---
  const win_rate_weighted = win_rate * 0.4;
  const roi_weighted = roi_score * 0.3;
  const timing_weighted = timing_score * 0.2;
  const sample_size_weighted = sample_size_score * 0.1;
  const composite = win_rate_weighted + roi_weighted + timing_weighted + sample_size_weighted;

  // --- Suspicious Insider Flag ---
  const is_suspicious_insider =
    win_rate > 0.75 &&
    avg_timing_hours >= 12 &&
    avg_timing_hours <= 96 &&
    sample_size > 15;

  return {
    win_rate,
    win_rate_weighted,
    roi,
    roi_score,
    roi_weighted,
    avg_timing_hours,
    timing_score,
    timing_weighted,
    sample_size,
    sample_size_score,
    sample_size_weighted,
    composite,
    is_suspicious_insider,
  };
}

/**
 * Check if a wallet exhibits bot-like patterns.
 */
export function isLikelyBot(trades: WalletTrade[]): boolean {
  if (trades.length < 20) return false;

  // Check for too-fast execution: most trades within seconds of each other
  const timestamps = trades.map((t) => new Date(t.timestamp).getTime()).sort();
  let fastCount = 0;
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] - timestamps[i - 1] < 5000) fastCount++;
  }
  if (fastCount / timestamps.length > 0.5) return true;

  // Check for arbitrage: always on both sides of same market
  const marketSides = new Map<string, Set<string>>();
  for (const t of trades) {
    const sides = marketSides.get(t.market_slug) || new Set();
    sides.add(`${t.outcome}:${t.side}`);
    marketSides.set(t.market_slug, sides);
  }
  let bothSidesCount = 0;
  marketSides.forEach((sides) => {
    if (sides.has('YES:BUY') && sides.has('NO:BUY')) bothSidesCount++;
  });
  if (marketSides.size > 5 && bothSidesCount / marketSides.size > 0.6) return true;

  return false;
}
