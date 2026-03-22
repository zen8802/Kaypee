'use client';

import { Trade } from '../lib/types';

interface Props {
  trades: Trade[];
}

export default function TradeLogger({ trades }: Props) {
  if (!trades.length) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        No trades yet. Find an opportunity and execute a trade to see it here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-card text-muted uppercase tracking-wider text-[9px]">
            <th className="text-left py-3 px-3">Market</th>
            <th className="text-left py-3 px-2">Platform</th>
            <th className="text-left py-3 px-2">Category</th>
            <th className="text-center py-3 px-2">Direction</th>
            <th className="text-right py-3 px-2">Entry</th>
            <th className="text-right py-3 px-2">Exit</th>
            <th className="text-right py-3 px-2">Size</th>
            <th className="text-right py-3 px-2">P&L</th>
            <th className="text-center py-3 px-2">AI Edge</th>
            <th className="text-center py-3 px-2">Correct</th>
            <th className="text-center py-3 px-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id} className="border-b border-border-card/50 hover:bg-bg-hover transition-colors group">
              <td className="py-3 px-3 max-w-[250px]">
                <div className="text-gray-300 truncate group-hover:text-gray-100 transition-colors">
                  {trade.market_title}
                </div>
                <div className="text-[10px] text-muted mt-0.5">
                  {new Date(trade.opened_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {trade.closed_at && (
                    <> → {new Date(trade.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                  )}
                </div>
              </td>
              <td className="py-3 px-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
                  trade.platform === 'kalshi'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                }`}>
                  {trade.platform}
                </span>
              </td>
              <td className="py-3 px-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-hover text-muted border border-border-card uppercase tracking-wider">
                  {trade.category}
                </span>
              </td>
              <td className="py-3 px-2 text-center">
                <span className={`font-bold ${trade.direction === 'YES' ? 'text-accent-green' : 'text-accent-red'}`}>
                  {trade.direction}
                </span>
              </td>
              <td className="py-3 px-2 text-right font-mono text-gray-300">
                {(trade.entry_price * 100).toFixed(0)}¢
              </td>
              <td className="py-3 px-2 text-right font-mono text-gray-300">
                {trade.exit_price !== null ? `${(trade.exit_price * 100).toFixed(0)}¢` : '—'}
              </td>
              <td className="py-3 px-2 text-right font-mono text-gray-300">
                ${trade.position_size.toFixed(0)}
              </td>
              <td className="py-3 px-2 text-right font-mono font-bold">
                {trade.pnl !== null ? (
                  <span className={trade.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="py-3 px-2 text-center font-mono">
                <span className={
                  trade.ai_edge_score > 30 ? 'text-accent-green' :
                  trade.ai_edge_score > 15 ? 'text-accent-yellow' : 'text-muted'
                }>
                  {trade.ai_edge_score.toFixed(1)}
                </span>
              </td>
              <td className="py-3 px-2 text-center">
                {trade.is_correct === true ? (
                  <span className="text-accent-green font-bold">✓</span>
                ) : trade.is_correct === false ? (
                  <span className="text-accent-red font-bold">✗</span>
                ) : (
                  <span className="text-muted">⋯</span>
                )}
              </td>
              <td className="py-3 px-2 text-center">
                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
                  trade.status === 'open'
                    ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                    : trade.status === 'closed'
                      ? 'bg-muted/10 text-muted border border-muted/20'
                      : 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20'
                }`}>
                  {trade.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
