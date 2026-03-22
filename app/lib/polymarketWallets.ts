import { WalletTrade, WalletPosition } from './types';

const POLYMARKET_GAMMA_BASE = 'https://gamma-api.polymarket.com';
const POLYMARKET_CLOB_BASE = 'https://clob.polymarket.com';

interface GammaActivity {
  title?: string;
  question?: string;
  slug?: string;
  market_slug?: string;
  outcome?: string;
  side?: string;
  price?: string;
  size?: string;
  timestamp?: string;
  type?: string;
}

/**
 * Fetch trade history for a Polymarket wallet address.
 * Uses the public Polymarket CLOB / Gamma API (read-only).
 */
export async function fetchWalletHistory(address: string): Promise<WalletTrade[]> {
  // Fetch from Polymarket's public activity endpoint
  const res = await fetch(
    `${POLYMARKET_GAMMA_BASE}/activity?address=${address}&limit=500&offset=0`
  );

  if (!res.ok) {
    // Try the CLOB orders endpoint as fallback
    return fetchFromClob(address);
  }

  const activities: GammaActivity[] = await res.json();

  return activities
    .filter((a) => a.type === 'TRADE' || a.side)
    .map((a): WalletTrade => ({
      market_slug: a.slug || a.market_slug || '',
      market_title: a.title || a.question || '',
      outcome: (a.outcome?.toUpperCase() === 'YES' ? 'YES' : 'NO') as 'YES' | 'NO',
      side: (a.side?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
      price: parseFloat(a.price || '0.5'),
      size: parseFloat(a.size || '0'),
      timestamp: a.timestamp || new Date().toISOString(),
      resolved: false,
      resolution_outcome: null,
      pnl: null,
    }));
}

async function fetchFromClob(address: string): Promise<WalletTrade[]> {
  const res = await fetch(
    `${POLYMARKET_CLOB_BASE}/data/trades?maker_address=${address}&limit=500`
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch wallet trades: ${res.status}`);
  }

  interface ClobTrade {
    market?: string;
    asset_id?: string;
    side?: string;
    price?: string;
    size?: string;
    outcome?: string;
    timestamp?: string;
    match_time?: string;
  }

  const data: ClobTrade[] = await res.json();

  return data.map((t): WalletTrade => ({
    market_slug: t.market || t.asset_id || '',
    market_title: t.market || '',
    outcome: (t.outcome?.toUpperCase() === 'YES' || t.side === 'BUY' ? 'YES' : 'NO') as 'YES' | 'NO',
    side: (t.side?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
    price: parseFloat(t.price || '0.5'),
    size: parseFloat(t.size || '0'),
    timestamp: t.timestamp || t.match_time || new Date().toISOString(),
    resolved: false,
    resolution_outcome: null,
    pnl: null,
  }));
}

/**
 * Fetch current open positions for a wallet.
 */
export async function fetchWalletPositions(address: string): Promise<WalletPosition[]> {
  const res = await fetch(
    `${POLYMARKET_GAMMA_BASE}/positions?address=${address}&sizeThreshold=0.1`
  );

  if (!res.ok) {
    return [];
  }

  interface GammaPosition {
    slug?: string;
    market_slug?: string;
    title?: string;
    question?: string;
    outcome?: string;
    avgPrice?: string;
    size?: string;
    currentPrice?: string;
    outcomePrice?: string;
    timestamp?: string;
    created_at?: string;
  }

  const positions: GammaPosition[] = await res.json();

  return positions.map((p): WalletPosition => ({
    market_slug: p.slug || p.market_slug || '',
    market_title: p.title || p.question || '',
    outcome: (p.outcome?.toUpperCase() === 'YES' ? 'YES' : 'NO') as 'YES' | 'NO',
    avg_price: parseFloat(p.avgPrice || '0.5'),
    size: parseFloat(p.size || '0'),
    current_price: parseFloat(p.currentPrice || p.outcomePrice || '0.5'),
    opened_at: p.timestamp || p.created_at || new Date().toISOString(),
  }));
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
    // Also detect significant size increases
    const prev = previous.find(
      (pp) => pp.market_slug === p.market_slug && pp.outcome === p.outcome
    );
    return prev && p.size > prev.size * 1.5;
  });
}
