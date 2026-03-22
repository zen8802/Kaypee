'use client';

import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import TradeLogger from '../components/TradeLogger';
import { Trade } from '../lib/types';

interface TradeData {
  trades: Trade[];
  open_trades: Trade[];
  closed_trades: Trade[];
}

export default function TradesPage() {
  const [data, setData] = useState<TradeData | null>(null);
  const [tab, setTab] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    fetch('/api/trades')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-sm text-muted">Loading trades...</div>
        </div>
      </div>
    );
  }

  const closedTrades = data.closed_trades;
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins = closedTrades.filter((t) => t.is_correct === true).length;
  const losses = closedTrades.filter((t) => t.is_correct === false).length;
  const winRate = closedTrades.length > 0 ? wins / closedTrades.length : 0;
  const avgEdge = closedTrades.length > 0
    ? closedTrades.reduce((s, t) => s + t.ai_edge_score, 0) / closedTrades.length
    : 0;

  const displayTrades = tab === 'all' ? data.trades : tab === 'open' ? data.open_trades : data.closed_trades;

  // Category breakdown
  const categories = new Map<string, { correct: number; total: number; pnl: number }>();
  closedTrades.forEach((t) => {
    const cat = categories.get(t.category) || { correct: 0, total: 0, pnl: 0 };
    cat.total++;
    if (t.is_correct) cat.correct++;
    cat.pnl += t.pnl || 0;
    categories.set(t.category, cat);
  });

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-lg font-bold text-gray-200 mb-6">Trade Log</h1>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Total P&L</div>
            <div className={`text-xl font-bold font-mono ${totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}
            </div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Win Rate</div>
            <div className={`text-xl font-bold font-mono ${winRate >= 0.6 ? 'text-accent-green' : 'text-accent-yellow'}`}>
              {closedTrades.length > 0 ? `${(winRate * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="text-[10px] text-muted">{wins}W / {losses}L</div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Total Trades</div>
            <div className="text-xl font-bold font-mono text-gray-200">{data.trades.length}</div>
            <div className="text-[10px] text-muted">{data.open_trades.length} open</div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Avg Edge Score</div>
            <div className="text-xl font-bold font-mono text-accent-yellow">{avgEdge > 0 ? avgEdge.toFixed(1) : '—'}</div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Avg Position</div>
            <div className="text-xl font-bold font-mono text-gray-200">
              {data.trades.length > 0
                ? `$${Math.round(data.trades.reduce((s, t) => s + t.position_size, 0) / data.trades.length)}`
                : '—'}
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {categories.size > 0 && (
          <div className="border border-border-card rounded-lg bg-bg-card p-4 mb-6">
            <div className="text-[10px] text-muted uppercase tracking-wider font-bold mb-3">Accuracy by Category</div>
            <div className="flex gap-6">
              {Array.from(categories.entries()).map(([cat, stats]) => (
                <div key={cat} className="flex items-center gap-2 text-xs">
                  <span className="text-muted uppercase tracking-wider">{cat}</span>
                  <span className={`font-bold ${
                    stats.total > 0 && stats.correct / stats.total >= 0.7 ? 'text-accent-green' : 'text-accent-yellow'
                  }`}>
                    {stats.total > 0 ? `${((stats.correct / stats.total) * 100).toFixed(0)}%` : 'N/A'}
                  </span>
                  <span className="text-muted">({stats.correct}/{stats.total})</span>
                  <span className={`font-mono ${stats.pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {stats.pnl >= 0 ? '+' : ''}${stats.pnl}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {(['all', 'open', 'closed'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                tab === t
                  ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                  : 'text-muted hover:text-gray-300 hover:bg-bg-hover'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="ml-1.5 text-[10px] text-muted">
                ({t === 'all' ? data.trades.length : t === 'open' ? data.open_trades.length : data.closed_trades.length})
              </span>
            </button>
          ))}
        </div>

        {/* Trade Table */}
        <div className="border border-border-card rounded-lg bg-bg-card overflow-hidden">
          <TradeLogger trades={displayTrades} />
        </div>
      </main>
    </div>
  );
}
