import { Market, Analysis } from './types';

const SYSTEM_PROMPT = `You are a prediction market resolution analyst. Your job is to determine if a prediction market contract can already be resolved based on publicly available data.

CRITICAL RULES:
- Read the resolution criteria LITERALLY and EXACTLY. The title is often misleading.
- Search for the specific data the resolution criteria references
- If the contract resolves based on a specific data release, find that exact release
- If the contract resolves based on a sports result, find the official result
- If the contract resolves based on an election result, find the official certification
- Only flag HIGH confidence when you have found definitive data
- Output ONLY valid JSON, no markdown, no code fences`;

export async function analyzeMarket(
  market: Market,
  apiKey: string
): Promise<Analysis> {
  const userMessage = `Analyze this prediction market:

Title: ${market.title}
Current YES Price: ${market.yes_price} (implies ${(market.yes_price * 100).toFixed(1)}% probability)
Current NO Price: ${market.no_price} (implies ${(market.no_price * 100).toFixed(1)}% probability)
Resolution Rules: ${market.resolution_rules}
Closes: ${market.close_time}
Platform: ${market.platform}

Search for the most current data relevant to how this resolves. Then return this exact JSON:
{
  "resolution_certainty": <0-100>,
  "predicted_outcome": "YES" | "NO" | "UNCERTAIN",
  "predicted_probability": <0.0-1.0>,
  "reasoning": "<plain English explanation of your analysis>",
  "key_data_found": "<what specific data you found>",
  "data_source": "<URL or source name>",
  "confidence_in_rules_reading": "HIGH" | "MEDIUM" | "LOW",
  "edge_score": <calculated as resolution_certainty * abs(predicted_probability - ${market.yes_price}) / 100>
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ],
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract text blocks from response (may contain tool_use and text blocks)
  let jsonText = '';
  for (const block of data.content) {
    if (block.type === 'text') {
      jsonText += block.text;
    }
  }

  // Try to parse JSON from the response
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    id: crypto.randomUUID(),
    market_id: market.id,
    resolution_certainty: parsed.resolution_certainty,
    predicted_outcome: parsed.predicted_outcome,
    predicted_probability: parsed.predicted_probability,
    reasoning: parsed.reasoning,
    key_data_found: parsed.key_data_found,
    data_source: parsed.data_source,
    confidence_in_rules_reading: parsed.confidence_in_rules_reading,
    edge_score: parsed.edge_score,
    analyzed_at: new Date().toISOString(),
  };
}

export async function analyzeFromUrl(
  url: string,
  apiKey: string
): Promise<{ market: Partial<Market>; analysis: Analysis }> {
  // First, use Claude to extract market details from the URL
  const extractResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ],
      system: `You are a prediction market data extractor. Visit the given URL and extract market details, then analyze the resolution status.

Return ONLY valid JSON with this structure:
{
  "market": {
    "title": "<market title>",
    "resolution_rules": "<full resolution criteria>",
    "yes_price": <current yes price 0-1>,
    "no_price": <current no price 0-1>,
    "close_time": "<ISO date>",
    "platform": "kalshi" | "polymarket"
  },
  "analysis": {
    "resolution_certainty": <0-100>,
    "predicted_outcome": "YES" | "NO" | "UNCERTAIN",
    "predicted_probability": <0.0-1.0>,
    "reasoning": "<detailed analysis>",
    "key_data_found": "<what data you found>",
    "data_source": "<source>",
    "confidence_in_rules_reading": "HIGH" | "MEDIUM" | "LOW",
    "edge_score": <calculated>
  }
}`,
      messages: [
        {
          role: 'user',
          content: `Analyze this prediction market URL: ${url}`,
        },
      ],
    }),
  });

  if (!extractResponse.ok) {
    const error = await extractResponse.text();
    throw new Error(`Claude API error: ${extractResponse.status} - ${error}`);
  }

  const data = await extractResponse.json();
  let jsonText = '';
  for (const block of data.content) {
    if (block.type === 'text') {
      jsonText += block.text;
    }
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    market: {
      ...parsed.market,
      id: crypto.randomUUID(),
      market_id: url,
      url,
      category: 'other' as const,
      volume: 0,
      last_fetched: new Date().toISOString(),
    },
    analysis: {
      ...parsed.analysis,
      id: crypto.randomUUID(),
      market_id: crypto.randomUUID(),
      analyzed_at: new Date().toISOString(),
    },
  };
}
