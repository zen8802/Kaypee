import { WalletTrade, DiscoveryCandidate, TradeFingerprint, WalletClassification } from './types';
import { scoreWallet } from './walletScorer';
import { getWallets } from './store';

const DATA_API = 'https://data-api.polymarket.com';

interface PolyTrade {
  proxyWallet?: string;
  side?: string;
  size?: number;
  price?: number;
  timestamp?: number;
  title?: string;
  slug?: string;
  outcome?: string;
  outcomeIndex?: number;
}

// ============================================================
// Step 1: Pull candidate wallets from Polymarket public trades
// ============================================================

/**
 * Fetch recent trades from the public Polymarket data API and group by wallet.
 * Paginates to collect a large enough sample to find active traders.
 */
export async function fetchCandidateWallets(
  days: number = 60,
  maxTrades: number = 5000
): Promise<Map<string, WalletTrade[]>> {
  const walletTrades = new Map<string, WalletTrade[]>();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let offset = 0;
  const pageSize = 500;
  let totalFetched = 0;

  // Paginate through recent trades
  for (let page = 0; page < Math.ceil(maxTrades / pageSize); page++) {
    try {
      const res = await fetch(
        `${DATA_API}/trades?limit=${pageSize}&offset=${offset}`
      );

      if (!res.ok) {
        console.error(`Trades fetch failed at offset ${offset}: ${res.status}`);
        break;
      }

      const trades: PolyTrade[] = await res.json();
      if (!trades.length) break;

      for (const t of trades) {
        const addr = (t.proxyWallet || '').toLowerCase();
        if (!addr) continue;

        // Check timestamp cutoff
        const ts = t.timestamp ? t.timestamp * 1000 : Date.now();
        if (ts < cutoff) continue;

        const existing = walletTrades.get(addr) || [];
        existing.push({
          market_slug: t.slug || '',
          market_title: t.title || '',
          outcome: t.outcome?.toUpperCase() === 'NO' ? 'NO' : 'YES',
          side: (t.side || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
          price: t.price ?? 0.5,
          size: t.size ?? 0,
          timestamp: t.timestamp
            ? new Date(t.timestamp * 1000).toISOString()
            : new Date().toISOString(),
          resolved: false,
          resolution_outcome: null,
          pnl: null,
        });
        walletTrades.set(addr, existing);
      }

      totalFetched += trades.length;
      offset += pageSize;

      // If the last trade is older than our cutoff, stop
      const lastTs = trades[trades.length - 1]?.timestamp;
      if (lastTs && lastTs * 1000 < cutoff) break;
    } catch (e) {
      console.error(`Page ${page} fetch error:`, e);
      break;
    }
  }

  console.log(`Discovery: fetched ${totalFetched} trades from ${walletTrades.size} unique wallets`);

  // Now enrich top wallets with their full history
  // Sort wallets by trade count, take top ones
  const sorted = Array.from(walletTrades.entries())
    .sort((a, b) => b[1].length - a[1].length);

  // For the top wallets, fetch their full activity history
  const enrichCount = Math.min(100, sorted.length);
  for (let i = 0; i < enrichCount; i++) {
    const [addr, existingTrades] = sorted[i];
    if (existingTrades.length >= 10) continue; // already have enough from bulk fetch

    try {
      const res = await fetch(
        `${DATA_API}/activity?user=${addr}&limit=500`
      );
      if (!res.ok) continue;

      interface ActivityEntry {
        side?: string;
        size?: number;
        price?: number;
        timestamp?: number;
        title?: string;
        slug?: string;
        outcome?: string;
        type?: string;
      }

      const activities: ActivityEntry[] = await res.json();
      const enriched: WalletTrade[] = [];

      for (const a of activities) {
        if (!a.side || a.type === 'REDEEM') continue;
        enriched.push({
          market_slug: a.slug || '',
          market_title: a.title || '',
          outcome: a.outcome?.toUpperCase() === 'NO' ? 'NO' : 'YES',
          side: a.side.toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
          price: a.price ?? 0.5,
          size: a.size ?? 0,
          timestamp: a.timestamp
            ? new Date(a.timestamp * 1000).toISOString()
            : new Date().toISOString(),
          resolved: false,
          resolution_outcome: null,
          pnl: null,
        });
      }

      if (enriched.length > existingTrades.length) {
        walletTrades.set(addr, enriched);
      }
    } catch {
      // skip enrichment failures
    }
  }

  return walletTrades;
}

// ============================================================
// Step 2: Build trade fingerprint for each wallet
// ============================================================

export function buildFingerprint(trades: WalletTrade[]): TradeFingerprint {
  const buys = trades.filter((t) => t.side === 'BUY');
  const sells = trades.filter((t) => t.side === 'SELL');
  const marketSet = new Set(trades.map((t) => t.market_slug));

  // Timing between trades
  const timestamps = trades.map((t) => new Date(t.timestamp).getTime()).sort();
  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push((timestamps[i] - timestamps[i - 1]) / 1000);
  }
  gaps.sort((a, b) => a - b);
  const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 0;

  // Round sizes (within 1% of a round number)
  const roundCount = trades.filter((t) => {
    const s = t.size;
    return s > 0 && (s % 10 < 0.1 || s % 10 > 9.9 || s % 100 < 1 || s % 100 > 99);
  }).length;

  // Both sides check
  const marketSides = new Map<string, Set<string>>();
  for (const t of trades) {
    if (!t.market_slug) continue;
    const sides = marketSides.get(t.market_slug) || new Set<string>();
    sides.add(t.outcome);
    marketSides.set(t.market_slug, sides);
  }
  let bothCount = 0;
  marketSides.forEach((sides) => {
    if (sides.size > 1) bothCount++;
  });

  // Active hours
  const hourCounts = new Array(24).fill(0);
  trades.forEach((t) => {
    const h = new Date(t.timestamp).getUTCHours();
    hourCounts[h]++;
  });
  const activeHours = hourCounts
    .map((c: number, i: number) => (c > 0 ? i : -1))
    .filter((h: number) => h >= 0);

  // Category concentration
  const catMap: Record<string, number> = {};
  for (const t of trades) {
    const title = (t.market_title || '').toLowerCase();
    let cat = 'other';
    if (/elect|president|congress|vote|senate|politi/.test(title)) cat = 'politics';
    else if (/gdp|inflation|cpi|fed|unemployment|jobs|rate/.test(title)) cat = 'economics';
    else if (/bitcoin|btc|eth|crypto|solana/.test(title)) cat = 'crypto';
    else if (/nfl|nba|mlb|nhl|sport|game|match|championship/.test(title)) cat = 'sports';
    catMap[cat] = (catMap[cat] || 0) + 1;
  }

  // Win streak
  let maxStreak = 0;
  let currentStreak = 0;
  for (const t of buys) {
    if (t.resolved && t.outcome === t.resolution_outcome) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (t.resolved) {
      currentStreak = 0;
    }
  }

  // Directional ratio
  let directionalMarkets = 0;
  marketSides.forEach((sides) => {
    if (sides.size === 1) directionalMarkets++;
  });

  return {
    total_trades: trades.length,
    buy_count: buys.length,
    sell_count: sells.length,
    unique_markets: marketSet.size,
    avg_position_size: trades.length > 0
      ? trades.reduce((s, t) => s + t.size, 0) / trades.length
      : 0,
    median_time_between_trades_seconds: medianGap,
    pct_round_sizes: trades.length > 0 ? roundCount / trades.length : 0,
    pct_both_sides: marketSides.size > 0 ? bothCount / marketSides.size : 0,
    active_hours: activeHours,
    category_concentration: catMap,
    longest_win_streak: maxStreak,
    avg_entry_before_close_hours: 48,
    directional_ratio: marketSides.size > 0 ? directionalMarkets / marketSides.size : 0,
  };
}

// ============================================================
// Step 3: Claude classifies each candidate
// ============================================================

export async function classifyWallet(
  address: string,
  fingerprint: TradeFingerprint,
  score: ReturnType<typeof scoreWallet>,
  claudeApiKey: string
): Promise<{ classification: WalletClassification; reasoning: string }> {
  const fingerprintSummary = `
Address: ${address}
Total trades: ${fingerprint.total_trades}
Buy/Sell ratio: ${fingerprint.buy_count} buys / ${fingerprint.sell_count} sells
Unique markets: ${fingerprint.unique_markets}
Avg position size: $${fingerprint.avg_position_size.toFixed(0)}
Median seconds between trades: ${fingerprint.median_time_between_trades_seconds.toFixed(0)}
% round-number sizes: ${(fingerprint.pct_round_sizes * 100).toFixed(1)}%
% markets with both YES+NO positions: ${(fingerprint.pct_both_sides * 100).toFixed(1)}%
Active hours (UTC): [${fingerprint.active_hours.join(', ')}] (${fingerprint.active_hours.length}/24 hours)
Category concentration: ${JSON.stringify(fingerprint.category_concentration)}
Longest win streak: ${fingerprint.longest_win_streak}
Directional ratio: ${(fingerprint.directional_ratio * 100).toFixed(1)}% of markets are one-sided
${score ? `Win rate: ${(score.win_rate * 100).toFixed(1)}%` : 'Score: insufficient resolved data'}
${score ? `ROI: ${(score.roi * 100).toFixed(1)}%` : ''}
${score ? `Composite score: ${score.composite.toFixed(3)}` : ''}
${score?.is_suspicious_insider ? 'FLAG: Suspicious insider pattern detected' : ''}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You classify prediction market wallet addresses based on their trading fingerprint.

Classify into exactly ONE category:
- "bot": Median trade gap <5s, perfect round sizes (>70%), active 20+/24 hours, hundreds of markets simultaneously
- "arb": >40% of markets have both YES and NO positions, profit from spread not direction
- "human-retail": Normal human trader, average performance, nothing exceptional
- "human-informed": High win rate on directional bets, concentrated in few categories, directional ratio >60%, irregular timing suggesting human NOT bot, suspiciously good

When in doubt between human-retail and human-informed, look at: win rate >55%, directional ratio, category concentration, and win streaks.

Output ONLY valid JSON:
{
  "classification": "bot" | "arb" | "human-retail" | "human-informed",
  "reasoning": "<2-3 sentence explanation>"
}`,
      messages: [{
        role: 'user',
        content: `Classify this Polymarket wallet:\n${fingerprintSummary}`,
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude classification failed: ${response.status}`);
  }

  const data = await response.json();
  let jsonText = '';
  for (const block of data.content) {
    if (block.type === 'text') jsonText += block.text;
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { classification: 'human-retail', reasoning: 'Could not parse classification response' };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    classification: parsed.classification || 'human-retail',
    reasoning: parsed.reasoning || '',
  };
}

// ============================================================
// Full discovery pipeline
// ============================================================

export async function runDiscoveryPipeline(
  claudeApiKey: string,
  days: number = 60,
  minTrades: number = 10,
  minVolume: number = 500,
  maxTrades: number = 5000,
  classifyTop: number = 30
): Promise<DiscoveryCandidate[]> {
  // Step 1: Fetch universe of trades
  const walletTrades = await fetchCandidateWallets(days, maxTrades);

  const trackedAddresses = new Set(
    getWallets().map((w) => w.address.toLowerCase())
  );

  // Step 2: Filter and score
  const candidates: DiscoveryCandidate[] = [];

  walletTrades.forEach((trades, address) => {
    if (trades.length < minTrades) return;

    const totalVolume = trades.reduce((s, t) => s + t.size, 0);
    if (totalVolume < minVolume) return;

    // Require some buy activity
    const buys = trades.filter((t) => t.side === 'BUY');
    if (buys.length < 3) return;

    const fingerprint = buildFingerprint(trades);
    const score = scoreWallet(trades);

    // Basic stats
    const resolvedBuys = buys.filter((t) => t.resolved && t.resolution_outcome);
    const wins = resolvedBuys.filter((t) => t.outcome === t.resolution_outcome).length;
    const winRate = resolvedBuys.length > 0 ? wins / resolvedBuys.length : 0;

    let totalInvested = 0;
    let totalReturn = 0;
    for (const t of resolvedBuys) {
      const invested = t.price * t.size;
      totalInvested += invested;
      if (t.outcome === t.resolution_outcome) {
        totalReturn += (1 - t.price) * t.size;
      } else {
        totalReturn -= invested;
      }
    }
    const roi = totalInvested > 0 ? totalReturn / totalInvested : 0;

    candidates.push({
      address,
      trade_count: trades.length,
      total_volume: totalVolume,
      win_rate: winRate,
      roi,
      avg_timing_hours: score?.avg_timing_hours ?? 0,
      score,
      classification: null,
      classification_reasoning: '',
      is_already_tracked: trackedAddresses.has(address),
      fingerprint,
    });
  });

  // Sort by trade count (most active first, since we may not have resolution data)
  candidates.sort((a, b) => {
    const scoreA = a.score?.composite ?? (a.trade_count / 100);
    const scoreB = b.score?.composite ?? (b.trade_count / 100);
    return scoreB - scoreA;
  });

  // Step 3: Claude classifies the top N
  const topCandidates = candidates.slice(0, classifyTop);
  for (const candidate of topCandidates) {
    try {
      const result = await classifyWallet(
        candidate.address,
        candidate.fingerprint,
        candidate.score,
        claudeApiKey
      );
      candidate.classification = result.classification;
      candidate.classification_reasoning = result.reasoning;
    } catch (e) {
      console.error(`Classification failed for ${candidate.address}:`, e);
      candidate.classification = 'human-retail';
      candidate.classification_reasoning = 'Classification API call failed';
    }
  }

  return candidates;
}
