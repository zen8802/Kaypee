'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '../../components/Navigation';
import WalletScoreBreakdownComponent from '../../components/WalletScoreBreakdown';
import { TrackedWallet } from '../../lib/types';

export default function WalletDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const [wallet, setWallet] = useState<TrackedWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/wallets/${address}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setWallet(d.wallet);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [address]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/wallets/${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: true }),
      });
      const d = await res.json();
      if (d.wallet) setWallet(d.wallet);
    } catch { /* ignore */ }
    finally { setRefreshing(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-sm text-muted">Loading wallet...</div>
        </div>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-sm text-accent-red">{error || 'Wallet not found'}</div>
        </div>
      </div>
    );
  }

  const truncAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
  const buyTrades = wallet.trades.filter((t) => t.side === 'BUY');
  const resolvedTrades = buyTrades.filter((t) => t.resolved);
  const wins = resolvedTrades.filter((t) => t.outcome === t.resolution_outcome);

  // Group trades by market
  const marketMap = new Map<string, typeof wallet.trades>();
  for (const t of wallet.trades) {
    const key = t.market_slug || t.market_title;
    const arr = marketMap.get(key) || [];
    arr.push(t);
    marketMap.set(key, arr);
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-gray-200">{wallet.label}</h1>
              {wallet.score?.is_suspicious_insider && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-bold">
                  Insider Flag
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono text-muted mt-0.5">{truncAddr}</div>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="px-4 py-2 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-xs font-bold hover:bg-accent-green/20 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {refreshing && (
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Smart Money Score</div>
            <div className={`text-xl font-bold ${
              wallet.score?.is_suspicious_insider ? 'text-purple-400' :
              (wallet.score?.composite ?? 0) >= 0.65 ? 'text-accent-green' :
              (wallet.score?.composite ?? 0) >= 0.4 ? 'text-accent-yellow' : 'text-accent-red'
            }`}>
              {wallet.score ? wallet.score.composite.toFixed(3) : '—'}
            </div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Win Rate</div>
            <div className="text-xl font-bold text-gray-200">
              {resolvedTrades.length > 0 ? `${((wins.length / resolvedTrades.length) * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="text-[10px] text-muted">{wins.length}W / {resolvedTrades.length - wins.length}L</div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Total Trades</div>
            <div className="text-xl font-bold text-gray-200">{wallet.trade_count}</div>
            <div className="text-[10px] text-muted">{buyTrades.length} buys</div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Active Positions</div>
            <div className="text-xl font-bold text-accent-blue">{wallet.active_positions.length}</div>
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card p-3">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-1">Last Scanned</div>
            <div className="text-sm font-bold text-muted">
              {wallet.last_scanned ? new Date(wallet.last_scanned).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Score Breakdown */}
          <div>
            {wallet.score ? (
              <WalletScoreBreakdownComponent score={wallet.score} />
            ) : (
              <div className="border border-border-card rounded-lg bg-bg-card p-4">
                <div className="text-[10px] text-muted uppercase tracking-wider font-bold mb-3">Score Breakdown</div>
                <div className="text-xs text-muted text-center py-8">
                  Need 10+ resolved directional trades to generate score
                </div>
              </div>
            )}
          </div>

          {/* Active Positions */}
          <div className="col-span-2">
            <div className="border border-border-card rounded-lg bg-bg-card p-4">
              <div className="text-[10px] text-muted uppercase tracking-wider font-bold mb-3">
                Active Positions ({wallet.active_positions.length})
              </div>
              {wallet.active_positions.length > 0 ? (
                <div className="space-y-2">
                  {wallet.active_positions.map((pos, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border-card/50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-200 truncate">{pos.market_title || pos.market_slug}</div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px]">
                          <span className={`font-bold ${pos.outcome === 'YES' ? 'text-accent-green' : 'text-accent-red'}`}>
                            {pos.outcome}
                          </span>
                          <span className="text-muted">
                            Avg: <span className="text-gray-400">{(pos.avg_price * 100).toFixed(0)}¢</span>
                          </span>
                          <span className="text-muted">
                            Current: <span className="text-gray-400">{(pos.current_price * 100).toFixed(0)}¢</span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono text-gray-300">${pos.size.toFixed(0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted text-center py-8">No active positions</div>
              )}
            </div>
          </div>
        </div>

        {/* Trade History by Market */}
        <div className="mt-6">
          <div className="text-[10px] text-muted uppercase tracking-wider font-bold mb-3">
            Trade History ({wallet.trades.length} trades across {marketMap.size} markets)
          </div>
          <div className="border border-border-card rounded-lg bg-bg-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-card text-muted uppercase tracking-wider text-[9px]">
                  <th className="text-left py-3 px-3">Market</th>
                  <th className="text-center py-3 px-2">Side</th>
                  <th className="text-center py-3 px-2">Outcome</th>
                  <th className="text-right py-3 px-2">Price</th>
                  <th className="text-right py-3 px-2">Size</th>
                  <th className="text-center py-3 px-2">Result</th>
                  <th className="text-right py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {wallet.trades.slice(0, 50).map((trade, i) => {
                  const correct = trade.resolved && trade.outcome === trade.resolution_outcome;
                  const wrong = trade.resolved && trade.outcome !== trade.resolution_outcome;
                  return (
                    <tr key={i} className="border-b border-border-card/50 hover:bg-bg-hover transition-colors">
                      <td className="py-2 px-3 max-w-[300px] truncate text-gray-300">
                        {trade.market_title || trade.market_slug}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={trade.side === 'BUY' ? 'text-accent-green' : 'text-accent-red'}>{trade.side}</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={trade.outcome === 'YES' ? 'text-accent-green' : 'text-accent-red'}>{trade.outcome}</span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-gray-300">{(trade.price * 100).toFixed(0)}¢</td>
                      <td className="py-2 px-2 text-right font-mono text-gray-300">${trade.size.toFixed(0)}</td>
                      <td className="py-2 px-2 text-center">
                        {correct ? <span className="text-accent-green font-bold">✓</span> :
                         wrong ? <span className="text-accent-red font-bold">✗</span> :
                         <span className="text-muted">⋯</span>}
                      </td>
                      <td className="py-2 px-2 text-right text-muted">
                        {new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {wallet.trades.length > 50 && (
              <div className="py-2 text-center text-[10px] text-muted border-t border-border-card">
                Showing first 50 of {wallet.trades.length} trades
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
