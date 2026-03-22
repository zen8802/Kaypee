'use client';

import { useState } from 'react';
import { Opportunity } from '../lib/types';

interface Props {
  opportunity: Opportunity;
  bankroll: number;
}

export default function OpportunityCard({ opportunity, bankroll }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { market, analysis } = opportunity;

  const edgeColor =
    analysis.edge_score > 30
      ? 'text-accent-green'
      : analysis.edge_score > 15
        ? 'text-accent-yellow'
        : 'text-muted';

  const edgeBg =
    analysis.edge_score > 30
      ? 'bg-accent-green/5 border-accent-green/20'
      : analysis.edge_score > 15
        ? 'bg-accent-yellow/5 border-accent-yellow/20'
        : 'bg-bg-card border-border-card';

  const direction = analysis.predicted_outcome === 'YES'
    ? (analysis.predicted_probability > market.yes_price ? 'BUY YES' : 'BUY NO')
    : analysis.predicted_outcome === 'NO'
      ? (analysis.predicted_probability < market.yes_price ? 'BUY NO' : 'BUY YES')
      : 'NO TRADE';

  const directionColor = direction === 'BUY YES' ? 'text-accent-green' : direction === 'BUY NO' ? 'text-accent-red' : 'text-muted';

  return (
    <div
      className={`border rounded-lg p-4 card-hover cursor-pointer ${edgeBg}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main Row */}
      <div className="flex items-center gap-4">
        {/* Edge Score */}
        <div className="flex-shrink-0 w-16 text-center">
          <div className={`text-xl font-bold ${edgeColor}`}>
            {analysis.edge_score.toFixed(1)}
          </div>
          <div className="text-[9px] text-muted uppercase tracking-wider">Edge</div>
        </div>

        {/* Market Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
              market.platform === 'kalshi'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              {market.platform}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-hover text-muted border border-border-card uppercase tracking-wider">
              {market.category}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-200 truncate">
            {market.title}
          </div>
        </div>

        {/* Prices */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xs text-muted mb-0.5">Market Price</div>
          <div className="text-sm font-mono">
            YES <span className="text-accent-green">{(market.yes_price * 100).toFixed(0)}¢</span>
            {' / '}
            NO <span className="text-accent-red">{(market.no_price * 100).toFixed(0)}¢</span>
          </div>
        </div>

        {/* AI Prediction */}
        <div className="flex-shrink-0 text-right w-24">
          <div className="text-xs text-muted mb-0.5">AI Predicts</div>
          <div className={`text-sm font-bold ${
            analysis.predicted_outcome === 'YES' ? 'text-accent-green' :
            analysis.predicted_outcome === 'NO' ? 'text-accent-red' : 'text-muted'
          }`}>
            {analysis.predicted_outcome} ({(analysis.predicted_probability * 100).toFixed(0)}%)
          </div>
        </div>

        {/* Certainty */}
        <div className="flex-shrink-0 w-16 text-center">
          <div className="text-sm font-bold text-gray-200">{analysis.resolution_certainty}%</div>
          <div className="text-[9px] text-muted uppercase tracking-wider">Certain</div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0 w-24 text-center">
          <div className={`text-xs font-bold ${directionColor}`}>{direction}</div>
          {opportunity.recommended_size > 0 && (
            <div className="text-[10px] text-muted">${opportunity.recommended_size.toFixed(0)}</div>
          )}
        </div>

        {/* Expand Arrow */}
        <div className="flex-shrink-0 text-muted">
          <span className={`transition-transform inline-block ${expanded ? 'rotate-90' : ''}`}>▸</span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border-card">
          <div className="grid grid-cols-2 gap-4">
            {/* AI Reasoning */}
            <div>
              <div className="text-[10px] text-accent-green uppercase tracking-wider mb-2 font-bold">
                ◈ AI Reasoning
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{analysis.reasoning}</p>
            </div>

            {/* Key Data */}
            <div>
              <div className="text-[10px] text-accent-blue uppercase tracking-wider mb-2 font-bold">
                ⟐ Key Data Found
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{analysis.key_data_found}</p>
              <div className="mt-2 text-[10px] text-muted">
                Source: {analysis.data_source}
              </div>
            </div>
          </div>

          {/* Trade Details */}
          <div className="mt-4 flex items-center gap-6 text-xs">
            <div>
              <span className="text-muted">Confidence: </span>
              <span className={`font-bold ${
                analysis.confidence_in_rules_reading === 'HIGH' ? 'text-accent-green' :
                analysis.confidence_in_rules_reading === 'MEDIUM' ? 'text-accent-yellow' : 'text-accent-red'
              }`}>
                {analysis.confidence_in_rules_reading}
              </span>
            </div>
            <div>
              <span className="text-muted">Volume: </span>
              <span className="text-gray-300">${(market.volume / 1000).toFixed(0)}K</span>
            </div>
            <div>
              <span className="text-muted">Closes: </span>
              <span className="text-gray-300">
                {new Date(market.close_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div>
              <span className="text-muted">Kelly: </span>
              <span className="text-gray-300">{(opportunity.kelly_fraction * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-muted">Position: </span>
              <span className="text-accent-green font-bold">${opportunity.recommended_size.toFixed(0)}</span>
              <span className="text-muted"> ({((opportunity.recommended_size / bankroll) * 100).toFixed(1)}% of bankroll)</span>
            </div>
            <div>
              <span className="text-muted">Est. Profit: </span>
              <span className={opportunity.estimated_profit >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                ${opportunity.estimated_profit.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Resolution Rules */}
          <div className="mt-4 p-3 bg-bg-primary rounded border border-border-card">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1 font-bold">
              Resolution Rules (Verbatim)
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed font-mono">{market.resolution_rules}</p>
          </div>
        </div>
      )}
    </div>
  );
}
