'use client';

import { useState } from 'react';
import { Analysis, Market } from '../lib/types';

interface AnalysisResult {
  market: Partial<Market>;
  analysis: Analysis;
}

interface Props {
  apiKey?: string;
}

export default function MarketAnalyzer({ apiKey }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);

  const steps = [
    'Fetching market data...',
    'Reading resolution rules...',
    'Searching for real-world data...',
    'Cross-referencing with resolution criteria...',
    'Calculating edge score...',
  ];

  const analyze = async () => {
    if (!apiKey) {
      setError('Claude API key required. Set it in Settings.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setStep(0);

    const stepInterval = setInterval(() => {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }, 800);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, api_key: apiKey }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Input */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste Kalshi or Polymarket URL..."
          className="flex-1 bg-bg-primary border border-border-card rounded px-4 py-2.5 text-sm text-gray-200 placeholder-muted focus:outline-none focus:border-accent-green/40 font-mono"
        />
        <button
          onClick={analyze}
          disabled={loading || !url || !apiKey}
          className="px-6 py-2.5 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-sm font-bold hover:bg-accent-green/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {/* Loading Steps */}
      {loading && (
        <div className="border border-border-card rounded-lg p-4 bg-bg-card mb-6">
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {i < step ? (
                  <span className="text-accent-green">✓</span>
                ) : i === step ? (
                  <span className="text-accent-yellow animate-pulse">▸</span>
                ) : (
                  <span className="text-muted">○</span>
                )}
                <span className={i <= step ? 'text-gray-300' : 'text-muted'}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-accent-red/20 bg-accent-red/5 rounded-lg p-4 mb-6">
          <div className="text-xs text-accent-red font-bold mb-1">ERROR</div>
          <div className="text-sm text-gray-300">{error}</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="border border-border-card rounded-lg bg-bg-card overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-200">{result.market.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                    {result.market.platform}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  result.analysis.edge_score > 30 ? 'text-accent-green glow-green' :
                  result.analysis.edge_score > 15 ? 'text-accent-yellow glow-yellow' : 'text-muted'
                }`}>
                  {result.analysis.edge_score.toFixed(1)}
                </div>
                <div className="text-[9px] text-muted uppercase tracking-wider">Edge Score</div>
              </div>
            </div>
          </div>

          {/* Analysis Grid */}
          <div className="p-4 grid grid-cols-4 gap-4 border-b border-border-card">
            <div>
              <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Predicted Outcome</div>
              <div className={`text-lg font-bold ${
                result.analysis.predicted_outcome === 'YES' ? 'text-accent-green' :
                result.analysis.predicted_outcome === 'NO' ? 'text-accent-red' : 'text-muted'
              }`}>
                {result.analysis.predicted_outcome}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-muted uppercase tracking-wider mb-1">AI Probability</div>
              <div className="text-lg font-bold text-gray-200">
                {(result.analysis.predicted_probability * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Certainty</div>
              <div className="text-lg font-bold text-gray-200">{result.analysis.resolution_certainty}%</div>
            </div>
            <div>
              <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Rules Confidence</div>
              <div className={`text-lg font-bold ${
                result.analysis.confidence_in_rules_reading === 'HIGH' ? 'text-accent-green' :
                result.analysis.confidence_in_rules_reading === 'MEDIUM' ? 'text-accent-yellow' : 'text-accent-red'
              }`}>
                {result.analysis.confidence_in_rules_reading}
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div className="p-4 border-b border-border-card">
            <div className="text-[10px] text-accent-green uppercase tracking-wider mb-2 font-bold">◈ AI Reasoning</div>
            <p className="text-xs text-gray-300 leading-relaxed">{result.analysis.reasoning}</p>
          </div>

          {/* Key Data */}
          <div className="p-4 border-b border-border-card">
            <div className="text-[10px] text-accent-blue uppercase tracking-wider mb-2 font-bold">⟐ Key Data Found</div>
            <p className="text-xs text-gray-300 leading-relaxed">{result.analysis.key_data_found}</p>
            <div className="mt-2 text-[10px] text-muted">Source: {result.analysis.data_source}</div>
          </div>

          {/* Market Prices */}
          {result.market.yes_price !== undefined && (
            <div className="p-4">
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-muted">YES Price: </span>
                  <span className="text-accent-green font-mono">{(result.market.yes_price! * 100).toFixed(0)}¢</span>
                </div>
                <div>
                  <span className="text-muted">NO Price: </span>
                  <span className="text-accent-red font-mono">{(result.market.no_price! * 100).toFixed(0)}¢</span>
                </div>
                {result.market.close_time && (
                  <div>
                    <span className="text-muted">Closes: </span>
                    <span className="text-gray-300">
                      {new Date(result.market.close_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
