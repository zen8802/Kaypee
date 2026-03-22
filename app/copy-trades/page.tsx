'use client';

import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import CopyTradeCard from '../components/CopyTradeCard';
import { CopyTrade } from '../lib/types';

interface CopyTradeData {
  trades: CopyTrade[];
  open_trades: CopyTrade[];
  closed_trades: CopyTrade[];
  stats: {
    total_pnl: number;
    win_rate: number;
    total_trades: number;
    open_count: number;
  };
}

export default function CopyTradesPage() {
  const [data, setData] = useState<CopyTradeData | null>(null);
  const [tab, setTab] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    fetch('/api/copy-trades')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-sm text-muted">Loading copy trades...</div>
        </div>
      </div>
    );
  }

  const { stats } = data;
  const displayTrades = tab === 'all' ? data.trades : tab === 'open' ? data.open_trades : data.closed_trades;

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-lg font-bold text-gray-200 mb-6">Copy Trade Log</h1>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Total P&L</div>
            <div className={`text-xl font-bold font-mono ${stats.total_pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {stats.total_pnl >= 0 ? '+' : ''}${stats.total_pnl.toFixed(0)}
            </div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Win Rate</div>
            <div className={`text-xl font-bold font-mono ${stats.win_rate >= 0.6 ? 'text-accent-green' : 'text-accent-yellow'}`}>
              {stats.total_trades > 0 ? `${(stats.win_rate * 100).toFixed(1)}%` : '—'}
            </div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Total Trades</div>
            <div className="text-xl font-bold font-mono text-gray-200">{stats.total_trades}</div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Open</div>
            <div className="text-xl font-bold font-mono text-accent-blue">{stats.open_count}</div>
          </div>
        </div>

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

        {/* Trade List */}
        {displayTrades.length > 0 ? (
          <div className="space-y-2">
            {displayTrades.map((trade) => (
              <CopyTradeCard key={trade.id} trade={trade} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-border-card rounded-lg bg-bg-card">
            <div className="text-muted text-2xl mb-3">⟁</div>
            <div className="text-sm text-gray-400 mb-1">No copy trades yet</div>
            <p className="text-xs text-muted">
              Copy trades appear here when you execute signals from the Wallet Tracker.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
