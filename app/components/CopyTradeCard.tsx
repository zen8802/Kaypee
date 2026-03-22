'use client';

import { CopyTrade } from '../lib/types';

interface Props {
  trade: CopyTrade;
}

export default function CopyTradeCard({ trade }: Props) {
  return (
    <div className="border border-border-card rounded-lg bg-bg-card p-4 card-hover">
      <div className="flex items-center gap-4">
        {/* Source Wallet */}
        <div className="flex-shrink-0 w-20">
          <div className={`text-xs font-bold ${
            trade.source_wallet_score >= 0.65 ? 'text-accent-green' :
            trade.source_wallet_score >= 0.4 ? 'text-accent-yellow' : 'text-accent-red'
          }`}>
            {trade.source_wallet_score.toFixed(2)}
          </div>
          <div className="text-[9px] text-muted truncate">{trade.source_wallet_label}</div>
        </div>

        {/* Signal Flow: Poly → Kalshi */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-bold">
              Poly
            </span>
            <span className="text-[10px] text-muted">→</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-bold">
              Kalshi
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
              trade.match_confidence === 'HIGH' ? 'bg-accent-green/10 text-accent-green border-accent-green/20' :
              trade.match_confidence === 'MEDIUM' ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20' :
              'bg-accent-red/10 text-accent-red border-accent-red/20'
            }`}>
              {trade.match_confidence}
            </span>
          </div>
          <div className="text-xs text-gray-200 truncate">{trade.kalshi_title}</div>
          <div className="flex items-center gap-3 mt-1 text-[10px]">
            <span className="text-muted">
              Signal: <span className="text-purple-400">{(trade.poly_signal_price * 100).toFixed(0)}¢</span>
            </span>
            <span className="text-muted">
              Entry: <span className="text-blue-400">{(trade.entry_price * 100).toFixed(0)}¢</span>
            </span>
            <span className="text-muted">
              Direction: <span className={`font-bold ${trade.kalshi_direction === 'YES' ? 'text-accent-green' : 'text-accent-red'}`}>
                {trade.kalshi_direction}
              </span>
            </span>
            <span className="text-muted">
              Size: <span className="text-gray-400">${trade.position_size.toFixed(0)}</span>
            </span>
          </div>
        </div>

        {/* P&L */}
        <div className="flex-shrink-0 text-right w-20">
          {trade.pnl !== null ? (
            <>
              <div className={`text-sm font-bold font-mono ${trade.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)}
              </div>
              <div className="text-[9px] text-muted">
                {trade.is_correct ? '✓ Correct' : '✗ Wrong'}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted">Open</div>
          )}
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
            trade.status === 'open'
              ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
              : 'bg-muted/10 text-muted border border-muted/20'
          }`}>
            {trade.status}
          </span>
        </div>
      </div>
    </div>
  );
}
