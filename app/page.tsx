'use client';

import { useEffect, useState, useCallback } from 'react';
import Navigation from './components/Navigation';
import OpportunityCard from './components/OpportunityCard';
import BankrollChart from './components/BankrollChart';
import { Opportunity, PortfolioStats, Settings } from './lib/types';

interface DashboardData {
  opportunities: Opportunity[];
  filtered_opportunities: Opportunity[];
  stats: PortfolioStats;
  settings: Settings;
  last_scan: string | null;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<{ markets_fetched: number; markets_analyzed: number } | null>(null);
  const [scanElapsed, setScanElapsed] = useState(0);

  const fetchData = useCallback(() => {
    fetch('/api/markets')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runScan = async () => {
    if (!data) return;
    const { settings } = data;
    if (!settings.claude_api_key) {
      setScanError('Set your Claude API key in Settings first.');
      return;
    }
    setScanning(true);
    setScanError('');
    setScanResult(null);
    setScanElapsed(0);

    const timer = setInterval(() => setScanElapsed((s) => s + 1), 1000);

    try {
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claude_api_key: settings.claude_api_key,
          kalshi_api_key: settings.kalshi_api_key,
          kalshi_api_secret: settings.kalshi_api_secret,
        }),
      });
      const result = await res.json();
      if (result.error) {
        setScanError(result.error);
      } else {
        setScanResult(result);
        fetchData();
      }
    } catch {
      setScanError('Scan failed. Check your API keys.');
    } finally {
      clearInterval(timer);
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="text-accent-green text-2xl mb-4 animate-pulse">◆</div>
            <div className="text-sm text-muted">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, settings } = data;
  const opportunities = showAll ? data.opportunities : data.filtered_opportunities;
  const hasApiKey = !!settings.claude_api_key;
  const hasData = data.opportunities.length > 0;

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Header */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <StatCard label="Bankroll" value={`$${stats.total_bankroll.toLocaleString()}`} color="text-gray-100" />
          <StatCard
            label="Total P&L"
            value={`${stats.total_pnl >= 0 ? '+' : ''}$${stats.total_pnl.toLocaleString()}`}
            color={stats.total_pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}
            sub={stats.total_bankroll > 0 ? `${((stats.total_pnl / stats.total_bankroll) * 100).toFixed(1)}%` : '0%'}
          />
          <StatCard
            label="Win Rate"
            value={stats.total_trades > 0 ? `${(stats.win_rate * 100).toFixed(1)}%` : '—'}
            color={stats.win_rate >= 0.6 ? 'text-accent-green' : 'text-accent-yellow'}
            sub={`${stats.total_trades} trades`}
          />
          <StatCard label="Open Positions" value={String(stats.open_positions)} color="text-accent-blue" />
          <StatCard
            label="Avg Edge"
            value={stats.avg_edge_captured > 0 ? stats.avg_edge_captured.toFixed(1) : '—'}
            color="text-accent-yellow"
          />
          <StatCard
            label="Last Scan"
            value={data.last_scan ? new Date(data.last_scan).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            color="text-muted"
          />
        </div>

        {/* Bankroll Chart */}
        {stats.bankroll_history.length > 1 && (
          <div className="border border-border-card rounded-lg bg-bg-card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-muted uppercase tracking-wider font-bold">Bankroll Performance</div>
              <div className="text-xs text-accent-green font-mono">
                {stats.total_pnl >= 0 ? '+' : ''}${stats.total_pnl.toLocaleString()}
              </div>
            </div>
            <BankrollChart data={stats.bankroll_history} height={180} />
          </div>
        )}

        {/* Setup prompt if no API key */}
        {!hasApiKey && (
          <div className="border border-accent-yellow/20 rounded-lg bg-accent-yellow/5 p-6 mb-6 text-center">
            <div className="text-accent-yellow text-lg mb-2">⚙</div>
            <div className="text-sm text-gray-200 mb-1">Configure API Keys to Start</div>
            <p className="text-xs text-muted mb-3">
              Go to Settings and add your Claude API key to enable market scanning and AI analysis.
              Kalshi credentials are optional (Polymarket is public).
            </p>
            <a href="/settings" className="inline-block px-4 py-2 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-xs font-bold hover:bg-accent-green/20 transition-colors">
              Open Settings
            </a>
          </div>
        )}

        {/* Scan Panel */}
        {hasApiKey && (
          <div className="border border-border-card rounded-lg bg-bg-card p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={runScan}
                  disabled={scanning}
                  className="px-5 py-2.5 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-xs font-bold hover:bg-accent-green/20 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {scanning && (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {scanning ? 'Scanning...' : 'Scan Markets Now'}
                </button>

                {scanning && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-yellow animate-pulse-dot" />
                      Fetching markets & running AI analysis
                    </div>
                    <span className="text-[10px] font-mono text-muted">{formatTime(scanElapsed)}</span>
                  </div>
                )}

                {!scanning && scanResult && (
                  <div className="flex items-center gap-2 text-xs text-accent-green">
                    <span>✓</span>
                    <span>{scanResult.markets_fetched} markets fetched, {scanResult.markets_analyzed} analyzed</span>
                  </div>
                )}

                {!scanning && scanError && (
                  <div className="flex items-center gap-2 text-xs text-accent-red">
                    <span>✗</span>
                    <span>{scanError}</span>
                  </div>
                )}
              </div>

              {data.last_scan && (
                <div className="text-[10px] text-muted">
                  Last scan: {new Date(data.last_scan).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}
            </div>

            {scanning && (
              <div className="mt-3 space-y-2">
                <ScanStep label="Connecting to Polymarket API" done={scanElapsed > 2} active={scanElapsed <= 2} />
                <ScanStep label="Fetching open markets" done={scanElapsed > 5} active={scanElapsed > 2 && scanElapsed <= 5} />
                <ScanStep label="Running AI resolution analysis on each market" done={false} active={scanElapsed > 5} sub={scanElapsed > 5 ? `This is the slow part — Claude reads resolution rules and searches the web for each market (~5-10s each)` : undefined} />
              </div>
            )}
          </div>
        )}

        {/* Opportunities */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
                {showAll ? 'All Scanned Markets' : 'Live Opportunities'}
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                {opportunities.length}
              </span>
              {!showAll && (
                <span className="text-[10px] text-muted">
                  edge &gt; {settings.min_edge_score} + HIGH confidence
                </span>
              )}
            </div>
            {hasData && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-[10px] text-muted hover:text-gray-300 transition-colors"
              >
                {showAll ? 'Show filtered only' : `Show all (${data.opportunities.length})`}
              </button>
            )}
          </div>
        </div>

        {hasData ? (
          <div className="space-y-2">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp.market.id} opportunity={opp} bankroll={stats.total_bankroll} />
            ))}
            {opportunities.length === 0 && (
              <div className="text-center py-12 border border-border-card rounded-lg bg-bg-card">
                <div className="text-muted text-sm">No opportunities above threshold.</div>
                <button onClick={() => setShowAll(true)} className="text-accent-green text-xs mt-2 hover:underline">
                  Show all scanned markets
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 border border-border-card rounded-lg bg-bg-card">
            <div className="text-muted text-2xl mb-3">◈</div>
            <div className="text-sm text-gray-400 mb-1">No markets scanned yet</div>
            <p className="text-xs text-muted">
              {hasApiKey
                ? 'Hit "Scan Markets Now" to fetch live markets and run AI analysis.'
                : 'Add your API keys in Settings, then scan for opportunities.'}
            </p>
          </div>
        )}

        {/* P&L by Category — only show when there's data */}
        {Object.values(stats.pnl_by_category).some((v) => v !== 0) && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="border border-border-card rounded-lg bg-bg-card p-4">
              <div className="text-[10px] text-muted uppercase tracking-wider font-bold mb-3">P&L by Category</div>
              <div className="space-y-2">
                {Object.entries(stats.pnl_by_category)
                  .filter(([, v]) => v !== 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, pnl]) => (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <span className="text-muted uppercase tracking-wider">{cat}</span>
                      <span className={`font-mono font-bold ${pnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {pnl >= 0 ? '+' : ''}${pnl}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="border border-border-card rounded-lg bg-bg-card p-4">
              <div className="text-[10px] text-muted uppercase tracking-wider font-bold mb-3">Accuracy by Category</div>
              <div className="space-y-2">
                {Object.entries(stats.accuracy_by_category)
                  .filter(([, v]) => v.total > 0)
                  .sort(([, a], [, b]) => b.rate - a.rate)
                  .map(([cat, acc]) => (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <span className="text-muted uppercase tracking-wider">{cat}</span>
                      <div>
                        <span className={`font-mono font-bold ${acc.rate >= 0.7 ? 'text-accent-green' : acc.rate >= 0.5 ? 'text-accent-yellow' : 'text-accent-red'}`}>
                          {(acc.rate * 100).toFixed(0)}%
                        </span>
                        <span className="text-muted ml-2">({acc.correct}/{acc.total})</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="border border-border-card rounded-lg bg-bg-card p-3">
      <div className="text-[9px] text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function ScanStep({ label, done, active, sub }: { label: string; done: boolean; active: boolean; sub?: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      {done ? (
        <span className="text-accent-green mt-0.5">✓</span>
      ) : active ? (
        <svg className="animate-spin h-3 w-3 text-accent-yellow mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <span className="text-muted mt-0.5">○</span>
      )}
      <div>
        <span className={done ? 'text-accent-green' : active ? 'text-gray-300' : 'text-muted'}>{label}</span>
        {sub && active && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
