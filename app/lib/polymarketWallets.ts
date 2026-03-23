import { WalletTrade, WalletPosition } from './types';

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
  type?: string;
  conditionId?: string;
}

/**
 * Fetch trade history for a Polymarket wallet address.
 * Uses the public data-api.polymarket.com (read-only, no auth needed).
 */
export async function fetchWalletHistory(address: string): Promise<WalletTrade[]> {
  const allTrades: WalletTrade[] = [];
  let offset = 0;
  const limit = 500;

  // Paginate through activity
  for (let page = 0; page < 4; page++) {
    const res = await fetch(
      `${DATA_API}/activity?user=${address}&limit=${limit}&offset=${offset}`
    );

    if (!res.ok) break;

    const activities: PolyTrade[] = await res.json();
    if (!activities.length) break;

    for (const a of activities) {
      // Skip non-trade activity (REDEEMs, etc)
      if (a.type === 'REDEEM' || (!a.side && a.type !== 'TRADE')) continue;
      if (!a.side) continue;

      allTrades.push({
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

    if (activities.length < limit) break;
    offset += limit;
  }

  return allTrades;
}

/**
 * Fetch current open positions for a wallet.
 * Derives from activity — buys minus sells per market/outcome.
 */
export async function fetchWalletPositions(address: string): Promise<WalletPosition[]> {
  const trades = await fetchWalletHistory(address);

  // Aggregate net positions per market+outcome
  const posMap = new Map<string, { buys: number; sells: number; totalCost: number; title: string; slug: string; outcome: 'YES' | 'NO'; lastTimestamp: string }>();

  for (const t of trades) {
    const key = `${t.market_slug}:${t.outcome}`;
    const pos = posMap.get(key) || {
      buys: 0, sells: 0, totalCost: 0,
      title: t.market_title, slug: t.market_slug,
      outcome: t.outcome, lastTimestamp: t.timestamp,
    };

    if (t.side === 'BUY') {
      pos.buys += t.size;
      pos.totalCost += t.price * t.size;
    } else {
      pos.sells += t.size;
    }
    if (t.timestamp > pos.lastTimestamp) pos.lastTimestamp = t.timestamp;
    posMap.set(key, pos);
  }

  const positions: WalletPosition[] = [];
  posMap.forEach((pos) => {
    const netSize = pos.buys - pos.sells;
    if (netSize > 0.5) { // meaningful position
      positions.push({
        market_slug: pos.slug,
        market_title: pos.title,
        outcome: pos.outcome,
        avg_price: pos.buys > 0 ? pos.totalCost / pos.buys : 0.5,
        size: netSize,
        current_price: 0.5, // would need live price lookup
        opened_at: pos.lastTimestamp,
      });
    }
  });

  return positions;
}

/**
 * Detect new positions by comparing current vs. previously known positions.
 */
export function detectNewPositions(
  current: WalletPosition[],
  previous: WalletPosition[]
): WalletPosition[] {
  const prevKeys = new Set(
    previous.map((p) => `${p.market_slug}:${p.outcome}`)
  );

  return current.filter((p) => {
    const key = `${p.market_slug}:${p.outcome}`;
    if (!prevKeys.has(key)) return true;
    const prev = previous.find(
      (pp) => pp.market_slug === p.market_slug && pp.outcome === p.outcome
    );
    return prev && p.size > prev.size * 1.5;
  });
}
