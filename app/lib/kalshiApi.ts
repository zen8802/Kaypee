import { Market, MarketCategory } from './types';

const KALSHI_DEMO_BASE = 'https://demo-api.kalshi.co/trade-api/v2';
const KALSHI_PROD_BASE = 'https://trading-api.kalshi.com/trade-api/v2';

function categorizeMarket(title: string, ticker: string): MarketCategory {
  const t = (title + ' ' + ticker).toLowerCase();
  if (t.includes('nfl') || t.includes('nba') || t.includes('mlb') || t.includes('nhl') || t.includes('sport') || t.includes('game') || t.includes('match')) return 'sports';
  if (t.includes('elect') || t.includes('president') || t.includes('congress') || t.includes('vote') || t.includes('senat')) return 'politics';
  if (t.includes('gdp') || t.includes('inflation') || t.includes('unemployment') || t.includes('cpi') || t.includes('fed') || t.includes('rate') || t.includes('jobs')) return 'economics';
  if (t.includes('bitcoin') || t.includes('btc') || t.includes('eth') || t.includes('crypto') || t.includes('token')) return 'crypto';
  if (t.includes('weather') || t.includes('temperature') || t.includes('hurricane') || t.includes('rain') || t.includes('snow')) return 'weather';
  return 'other';
}

export async function fetchKalshiMarkets(
  apiKey: string,
  apiSecret: string,
  useProd: boolean = false
): Promise<Market[]> {
  const base = useProd ? KALSHI_PROD_BASE : KALSHI_DEMO_BASE;

  // Get auth token
  const authRes = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: apiKey, password: apiSecret }),
  });

  if (!authRes.ok) {
    throw new Error(`Kalshi auth failed: ${authRes.status}`);
  }

  const authData = await authRes.json();
  const token = authData.token;

  // Fetch markets
  const marketsRes = await fetch(`${base}/markets?status=open&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!marketsRes.ok) {
    throw new Error(`Kalshi markets fetch failed: ${marketsRes.status}`);
  }

  const marketsData = await marketsRes.json();

  return (marketsData.markets || []).map((m: Record<string, unknown>) => ({
    id: `kalshi_${m.ticker}`,
    platform: 'kalshi' as const,
    market_id: m.ticker as string,
    title: m.title as string || m.subtitle as string || '',
    resolution_rules: m.rules_primary as string || m.settlement_sources as string || '',
    yes_price: (m.yes_ask as number || 0) / 100,
    no_price: (m.no_ask as number || 0) / 100,
    volume: m.volume as number || 0,
    close_time: m.close_time as string || m.expiration_time as string || '',
    category: categorizeMarket(
      (m.title as string || '') + ' ' + (m.subtitle as string || ''),
      m.ticker as string || ''
    ),
    url: `https://kalshi.com/markets/${m.ticker}`,
    last_fetched: new Date().toISOString(),
  }));
}
