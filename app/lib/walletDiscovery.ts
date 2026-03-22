import { WalletTrade, DiscoveryCandidate, TradeFingerprint, WalletClassification } from './types';
import { scoreWallet } from './walletScorer';
import { getWallets } from './store';

const POLYMARKET_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/polymarket/polymarket-matic';
const POLYMARKET_GAMMA_BASE = 'https://gamma-api.polymarket.com';

// ============================================================
// Step 1: Pull candidate wallets from Polymarket
// ============================================================

interface SubgraphPosition {
  user: { id: string };
  market: { id: string; question: string; endTime: string };
  outcome: string;
  amount: string;
  timestamp: string;
}

interface SubgraphResponse {
  data?: {
    userPositions?: SubgraphPosition[];
  };
}

/**
 * Query the Polymarket subgraph for active wallets in the last N days.
 * Falls back to Gamma API if subgraph is unavailable.
 */
export async function fetchCandidateWallets(
  days: number = 60,
  limit: number = 500
): Promise<Map<string, WalletTrade[]>> {
  const walletTrades = new Map<string, WalletTrade[]>();

  // Try subgraph first
  try {
    const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
    const query = `{
      userPositions(
        where: { amount_gt: "100000000", timestamp_gt: "${since}" }
        orderBy: timestamp
        orderDirection: desc
        first: ${limit}
      ) {
        user { id }
        market { id question endTime }
        outcome
        amount
        timestamp
      }
    }`;

    const res = await fetch(POLYMARKET_SUBGRAPH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (res.ok) {
      const json: SubgraphResponse = await res.json();
      const positions = json.data?.userPositions ?? [];

      for (const pos of positions) {
        const addr = pos.user.id.toLowerCase();
        const trades = walletTrades.get(addr) || [];
        trades.push({
          market_slug: pos.market.id,
          market_title: pos.market.question,
          outcome: pos.outcome.toUpperCase() === 'YES' ? 'YES' : 'NO',
          side: 'BUY',
          price: 0.5, // subgraph doesn't give price directly
          size: parseInt(pos.amount) / 1e6, // USDC has 6 decimals
          timestamp: new Date(parseInt(pos.timestamp) * 1000).toISOString(),
          resolved: pos.market.endTime ? parseInt(pos.market.endTime) * 1000 < Date.now() : false,
          resolution_outcome: null,
          pnl: null,
        });
        walletTrades.set(addr, trades);
      }

      if (walletTrades.size > 0) return walletTrades;
    }
  } catch (e) {
    console.error('Subgraph query failed, falling back to Gamma:', e);
  }

  // Fallback: use Gamma API leaderboard / recent activity
  try {
    const res = await fetch(
      `${POLYMARKET_GAMMA_BASE}/markets?closed=true&limit=50&order=volume&ascending=false`
    );
    if (res.ok) {
      interface GammaMarket {
        id?: string;
        slug?: string;
        question?: string;
        endDate?: string;
      }
      const markets: GammaMarket[] = await res.json();

      // For each high-volume resolved market, fetch recent traders
      for (const market of markets.slice(0, 20)) {
        try {
          const actRes = await fetch(
            `${POLYMARKET_GAMMA_BASE}/activity?market=${market.slug || market.id}&limit=200`
          );
          if (!actRes.ok) continue;

          interface GammaActivity {
            address?: string;
            user?: string;
            outcome?: string;
            side?: string;
            price?: string;
            size?: string;
            timestamp?: string;
          }

          const activities: GammaActivity[] = await actRes.json();

          for (const act of activities) {
            const addr = (act.address || act.user || '').toLowerCase();
            if (!addr) continue;
            const trades = walletTrades.get(addr) || [];
            trades.push({
              market_slug: market.slug || market.id || '',
              market_title: market.question || '',
              outcome: (act.outcome?.toUpperCase() === 'YES' ? 'YES' : 'NO') as 'YES' | 'NO',
              side: (act.side?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
              price: parseFloat(act.price || '0.5'),
              size: parseFloat(act.size || '0'),
              timestamp: act.timestamp || new Date().toISOString(),
              resolved: market.endDate ? new Date(market.endDate).getTime() < Date.now() : false,
              resolution_outcome: null,
              pnl: null,
            });
            walletTrades.set(addr, trades);
          }
        } catch {
          // skip individual market failures
        }
      }
    }
  } catch (e) {
    console.error('Gamma fallback also failed:', e);
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
    .map((c, i) => (c > 0 ? i : -1))
    .filter((h) => h >= 0);

  // Category concentration (rough, based on title keywords)
  const catMap: Record<string, number> = {};
  for (const t of trades) {
    const title = t.market_title.toLowerCase();
    let cat = 'other';
    if (/elect|president|congress|vote|senate|politi/.test(title)) cat = 'politics';
    else if (/gdp|inflation|cpi|fed|unemployment|jobs|rate/.test(title)) cat = 'economics';
    else if (/bitcoin|btc|eth|crypto/.test(title)) cat = 'crypto';
    else if (/nfl|nba|mlb|nhl|sport|game/.test(title)) cat = 'sports';
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

  // Directional ratio: for each market, what % are one-sided
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
    avg_entry_before_close_hours: 48, // placeholder — would need market close times
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
${score ? `Win rate: ${(score.win_rate * 100).toFixed(1)}%` : 'Score: insufficient data'}
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

Classify into exactly ONE of these categories:
- "bot": Trades execute in <5s gaps, perfect round sizes, 24/7 activity, hundreds of markets
- "arb": Always on both YES and NO sides (>40% both-sides), profit from spread not direction
- "human-retail": Normal human trader, average performance, nothing special
- "human-informed": High win rate on directional bets, concentrated in few categories, entry timing 12-96hrs before resolution, irreguliar timing suggesting human, NOT a bot

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
  maxCandidates: number = 500,
  classifyTop: number = 30
): Promise<DiscoveryCandidate[]> {
  // Step 1: Fetch universe
  const walletTrades = await fetchCandidateWallets(days, maxCandidates);

  const trackedAddresses = new Set(
    getWallets().map((w) => w.address.toLowerCase())
  );

  // Step 2: Filter and score
  const candidates: DiscoveryCandidate[] = [];

  walletTrades.forEach((trades, address) => {
    // Min trade count filter
    if (trades.length < minTrades) return;

    // Min volume filter
    const totalVolume = trades.reduce((s, t) => s + t.size, 0);
    if (totalVolume < minVolume) return;

    // Directional filter: require majority buys
    const buys = trades.filter((t) => t.side === 'BUY');
    if (buys.length < trades.length * 0.3) return;

    const fingerprint = buildFingerprint(trades);
    const score = scoreWallet(trades);

    // Calculate basic stats
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

  // Sort by composite score (or win rate if no score)
  candidates.sort((a, b) => {
    const scoreA = a.score?.composite ?? a.win_rate * 0.5;
    const scoreB = b.score?.composite ?? b.win_rate * 0.5;
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
      candidate.classification_reasoning = 'Classification failed';
    }
  }

  // Return all candidates but with top ones classified
  return candidates;
}
