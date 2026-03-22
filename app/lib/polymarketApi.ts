import { Market, MarketCategory } from './types';

const POLYMARKET_CLOB_BASE = 'https://clob.polymarket.com';
const POLYMARKET_GAMMA_BASE = 'https://gamma-api.polymarket.com';

function categorizeMarket(title: string, description: string): MarketCategory {
  const t = (title + ' ' + description).toLowerCase();
  if (t.includes('nfl') || t.includes('nba') || t.includes('mlb') || t.includes('nhl') || t.includes('sport') || t.includes('game') || t.includes('match') || t.includes('championship')) return 'sports';
  if (t.includes('elect') || t.includes('president') || t.includes('congress') || t.includes('vote') || t.includes('senat') || t.includes('politi')) return 'politics';
  if (t.includes('gdp') || t.includes('inflation') || t.includes('unemployment') || t.includes('cpi') || t.includes('fed') || t.includes('rate') || t.includes('jobs') || t.includes('economic')) return 'economics';
  if (t.includes('bitcoin') || t.includes('btc') || t.includes('eth') || t.includes('crypto') || t.includes('token') || t.includes('blockchain')) return 'crypto';
  if (t.includes('weather') || t.includes('temperature') || t.includes('hurricane') || t.includes('rain') || t.includes('snow') || t.includes('climate')) return 'weather';
  return 'other';
}

export async function fetchPolymarketMarkets(): Promise<Market[]> {
  // Use Gamma API for market discovery (no auth needed)
  const res = await fetch(
    `${POLYMARKET_GAMMA_BASE}/markets?closed=false&limit=100&order=volume&ascending=false`
  );

  if (!res.ok) {
    throw new Error(`Polymarket fetch failed: ${res.status}`);
  }

  const markets = await res.json();

  return (markets || []).map((m: Record<string, unknown>) => {
    const prices = (m.outcomePrices as string) || '["0.5","0.5"]';
    let parsedPrices: number[];
    try {
      parsedPrices = JSON.parse(prices).map(Number);
    } catch {
      parsedPrices = [0.5, 0.5];
    }

    return {
      id: `poly_${m.id}`,
      platform: 'polymarket' as const,
      market_id: String(m.id),
      title: (m.question as string) || (m.title as string) || '',
      resolution_rules: (m.description as string) || '',
      yes_price: parsedPrices[0] || 0.5,
      no_price: parsedPrices[1] || 0.5,
      volume: Number(m.volume) || 0,
      close_time: (m.endDate as string) || (m.end_date_iso as string) || '',
      category: categorizeMarket(
        (m.question as string) || (m.title as string) || '',
        (m.description as string) || ''
      ),
      url: `https://polymarket.com/event/${m.slug || m.id}`,
      last_fetched: new Date().toISOString(),
    };
  });
}

export async function fetchPolymarketOrderbook(tokenId: string): Promise<{
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}> {
  const res = await fetch(`${POLYMARKET_CLOB_BASE}/book?token_id=${tokenId}`);
  if (!res.ok) {
    throw new Error(`Polymarket orderbook fetch failed: ${res.status}`);
  }
  return res.json();
}
