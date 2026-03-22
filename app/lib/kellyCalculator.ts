/**
 * Kelly Criterion Position Sizing
 * f* = (bp - q) / b
 * Where b = odds received, p = estimated win probability, q = 1-p
 * We use fractional Kelly for safety.
 */

export interface KellyResult {
  full_kelly: number;
  fractional_kelly: number;
  recommended_size: number;
  estimated_profit: number;
  edge_percentage: number;
}

export function calculateKelly(
  estimated_probability: number,
  market_price: number,
  bankroll: number,
  kelly_fraction: number = 0.25,
  max_position_pct: number = 0.05
): KellyResult {
  // Determine if we're buying YES or NO
  const buying_yes = estimated_probability > market_price;

  // Our entry price
  const entry_price = buying_yes ? market_price : (1 - market_price);

  // Our estimated win probability
  const p = buying_yes ? estimated_probability : (1 - estimated_probability);
  const q = 1 - p;

  // Odds received: profit per dollar risked
  // If we buy at entry_price, we win (1 - entry_price) and lose entry_price
  const b = (1 - entry_price) / entry_price;

  // Full Kelly fraction
  const full_kelly = Math.max(0, (b * p - q) / b);

  // Fractional Kelly for safety
  const fractional = full_kelly * kelly_fraction;

  // Cap at max position percentage
  const capped = Math.min(fractional, max_position_pct);

  // Dollar amount
  const recommended_size = Math.round(capped * bankroll * 100) / 100;

  // Expected profit
  const estimated_profit = Math.round(recommended_size * (p * (1 - entry_price) - q * entry_price) * 100) / 100;

  // Edge as percentage
  const edge_percentage = Math.round((p - entry_price) * 10000) / 100;

  return {
    full_kelly,
    fractional_kelly: fractional,
    recommended_size,
    estimated_profit,
    edge_percentage,
  };
}
