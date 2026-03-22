import { MarketMatch } from './types';

/**
 * Use Claude API to semantically match a Polymarket market to its Kalshi equivalent.
 * Claude handles fuzzy matching far better than string-distance algorithms.
 */
export async function mapPolymarketToKalshi(
  polyTitle: string,
  polyDescription: string,
  kalshiMarkets: Array<{ ticker: string; title: string; yes_price: number; no_price: number }>,
  claudeApiKey: string
): Promise<MarketMatch | null> {
  if (!kalshiMarkets.length) return null;

  const kalshiList = kalshiMarkets
    .map((m, i) => `${i + 1}. [${m.ticker}] ${m.title} (YES: ${(m.yes_price * 100).toFixed(0)}¢ / NO: ${(m.no_price * 100).toFixed(0)}¢)`)
    .join('\n');

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
      system: `You are a prediction market matcher. Given a Polymarket market, find the most equivalent Kalshi market from the list. Markets may have different titles but resolve on the same underlying event. Output ONLY valid JSON, no markdown.`,
      messages: [{
        role: 'user',
        content: `Polymarket market:
Title: "${polyTitle}"
Description: "${polyDescription}"

Available Kalshi markets:
${kalshiList}

Find the best match. Return JSON:
{
  "match_index": <1-based index or 0 if no match>,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "<why these match or don't>"
}

Rules:
- HIGH: Same underlying event, same resolution criteria
- MEDIUM: Same topic/event but resolution criteria might differ slightly
- LOW: Loosely related but not the same contract
- Return match_index: 0 if nothing matches`,
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error in market mapper: ${response.status}`);
  }

  const data = await response.json();
  let jsonText = '';
  for (const block of data.content) {
    if (block.type === 'text') jsonText += block.text;
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.match_index || parsed.match_index === 0) return null;

  const matched = kalshiMarkets[parsed.match_index - 1];
  if (!matched) return null;

  return {
    kalshi_ticker: matched.ticker,
    kalshi_title: matched.title,
    kalshi_yes_price: matched.yes_price,
    kalshi_no_price: matched.no_price,
    match_confidence: parsed.confidence,
    match_reasoning: parsed.reasoning,
  };
}
