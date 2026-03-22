'use client';

import { useState } from 'react';
import Navigation from '../../components/Navigation';
import { DiscoveryCandidate, WalletClassification } from '../../lib/types';

const classColors: Record<WalletClassification, { bg: string; text: string; border: string }> = {
  'human-informed': { bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/20' },
  'human-retail': { bg: 'bg-muted/10', text: 'text-muted', border: 'border-muted/20' },
  bot: { bg: 'bg-accent-red/10', text: 'text-accent-red', border: 'border-accent-red/20' },
  arb: { bg: 'bg-accent-yellow/10', text: 'text-accent-yellow', border: 'border-accent-yellow/20' },
};

interface DiscoveryResult {
  total_candidates: number;
  classified: number;
  breakdown: Record<string, number>;
  informed: DiscoveryCandidate[];
  all_candidates: DiscoveryCandidate[];
}

export default function DiscoverPage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'informed' | 'all'>('informed');
  const [addingAddress, setAddingAddress] = useState<string | null>(null);
  const [days, setDays] = useState(60);
  const [minTrades, setMinTrades] = useState(10);
  const [classifyTop, setClassifyTop] = useState(30);

  const runDiscovery = async () => {
    setRunning(true);
    setError('');
    setResult(null);
    setElapsed(0);

    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);

    try {
      const res = await fetch('/api/wallets/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, min_trades: minTrades, classify_top: classifyTop }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError('Discovery pipeline failed');
    } finally {
      clearInterval(timer);
      setRunning(false);
    }
  };

  const addToTracking = async (candidate: DiscoveryCandidate) => {
    setAddingAddress(candidate.address);
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: candidate.address,
          label: `Discovered ${candidate.address.slice(0, 6)}...${candidate.address.slice(-4)}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Mark as tracked in the local result
        if (result) {
          const updated = { ...result };
          const updateCandidate = (list: DiscoveryCandidate[]) =>
            list.map((c) =>
              c.address === candidate.address ? { ...c, is_already_tracked: true } : c
            );
          updated.informed = updateCandidate(updated.informed);
          updated.all_candidates = updateCandidate(updated.all_candidates);
          setResult(updated);
        }
      }
    } catch { /* ignore */ }
    finally {
      setAddingAddress(null);
    }
  };

  const displayCandidates = result
    ? viewMode === 'informed' ? result.informed : result.all_candidates
    : [];

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-200">Wallet Discovery</h1>
          <p className="text-xs text-muted mt-0.5">
            Automatically find informed traders on Polymarket using on-chain data + AI classification
          </p>
        </div>

        {/* Config Panel */}
        <div className="border border-border-card rounded-lg bg-bg-card p-4 mb-6">
          <div className="text-[10px] text-accent-green uppercase tracking-wider font-bold mb-3">Discovery Pipeline</div>

          <div className="flex items-end gap-4 mb-4">
            <div>
              <label className="text-[10px] text-muted block mb-1">Lookback (days)</label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                min={7}
                max={180}
                className="w-24 bg-bg-primary border border-border-card rounded px-2 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-accent-green/40"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">Min Trades</label>
              <input
                type="number"
                value={minTrades}
                onChange={(e) => setMinTrades(Number(e.target.value))}
                min={5}
                max={100}
                className="w-24 bg-bg-primary border border-border-card rounded px-2 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-accent-green/40"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">Classify Top N</label>
              <input
                type="number"
                value={classifyTop}
                onChange={(e) => setClassifyTop(Number(e.target.value))}
                min={5}
                max={100}
                className="w-24 bg-bg-primary border border-border-card rounded px-2 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-accent-green/40"
              />
            </div>
            <button
              onClick={runDiscovery}
              disabled={running}
              className="px-5 py-2 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-xs font-bold hover:bg-accent-green/20 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {running && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {running ? 'Running Pipeline...' : 'Run Discovery'}
            </button>
          </div>

          {/* Progress */}
          {running && (
            <div className="space-y-2">
              <ScanStep label="Querying Polymarket subgraph for active wallets" done={elapsed > 5} active={elapsed <= 5} />
              <ScanStep label={`Filtering: min ${minTrades} trades, min $500 volume, directional only`} done={elapsed > 10} active={elapsed > 5 && elapsed <= 10} />
              <ScanStep label="Scoring candidates with composite wallet scorer" done={elapsed > 15} active={elapsed > 10 && elapsed <= 15} />
              <ScanStep
                label={`Claude classifying top ${classifyTop} candidates (bot / arb / human-retail / human-informed)`}
                done={false}
                active={elapsed > 15}
                sub={elapsed > 15 ? `This takes ~5-10s per wallet — ${Math.min(classifyTop, Math.max(0, Math.floor((elapsed - 15) / 8)))}/${classifyTop} classified` : undefined}
              />
              <div className="text-[10px] font-mono text-muted mt-1">{formatTime(elapsed)}</div>
            </div>
          )}

          {error && (
            <div className="text-xs text-accent-red mt-2">✗ {error}</div>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <SummaryCard label="Total Candidates" value={result.total_candidates} color="text-gray-200" />
              <SummaryCard label="Classified" value={result.classified} color="text-gray-200" />
              <SummaryCard label="Human-Informed" value={result.breakdown['human-informed'] || 0} color="text-accent-green" />
              <SummaryCard label="Bots Filtered" value={result.breakdown.bot || 0} color="text-accent-red" />
              <SummaryCard label="Arb Filtered" value={result.breakdown.arb || 0} color="text-accent-yellow" />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setViewMode('informed')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'informed'
                    ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                    : 'text-muted hover:text-gray-300 hover:bg-bg-hover'
                }`}
              >
                Human-Informed ({result.informed.length})
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                    : 'text-muted hover:text-gray-300 hover:bg-bg-hover'
                }`}
              >
                All Candidates ({result.all_candidates.length})
              </button>
            </div>

            {/* Candidate List */}
            <div className="space-y-2">
              {displayCandidates.map((candidate) => (
                <CandidateRow
                  key={candidate.address}
                  candidate={candidate}
                  onAdd={addToTracking}
                  adding={addingAddress === candidate.address}
                />
              ))}
            </div>

            {displayCandidates.length === 0 && (
              <div className="text-center py-12 border border-border-card rounded-lg bg-bg-card">
                <div className="text-muted text-sm">
                  {viewMode === 'informed'
                    ? 'No human-informed wallets found in this scan. Try adjusting parameters or expanding the lookback window.'
                    : 'No candidates found.'}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!result && !running && (
          <div className="text-center py-16 border border-border-card rounded-lg bg-bg-card">
            <div className="text-muted text-2xl mb-3">◇</div>
            <div className="text-sm text-gray-400 mb-1">Automated Wallet Discovery</div>
            <p className="text-xs text-muted max-w-lg mx-auto">
              Queries Polymarket for active traders, scores them with the composite wallet scorer,
              then sends the top candidates to Claude for human vs. bot classification.
              Surfaces &quot;human-informed&quot; wallets with one-click tracking.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function CandidateRow({
  candidate,
  onAdd,
  adding,
}: {
  candidate: DiscoveryCandidate;
  onAdd: (c: DiscoveryCandidate) => void;
  adding: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncAddr = `${candidate.address.slice(0, 6)}...${candidate.address.slice(-4)}`;
  const cls = candidate.classification;
  const colors = cls ? classColors[cls] : { bg: 'bg-muted/10', text: 'text-muted', border: 'border-muted/20' };

  return (
    <div
      className={`border rounded-lg p-4 card-hover cursor-pointer ${
        cls === 'human-informed'
          ? 'border-accent-green/20 bg-accent-green/5'
          : 'border-border-card bg-bg-card'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-4">
        {/* Score */}
        <div className="flex-shrink-0 w-14 text-center">
          <div className={`text-lg font-bold ${
            (candidate.score?.composite ?? 0) >= 0.65 ? 'text-accent-green' :
            (candidate.score?.composite ?? 0) >= 0.4 ? 'text-accent-yellow' : 'text-muted'
          }`}>
            {candidate.score ? candidate.score.composite.toFixed(2) : '—'}
          </div>
          <div className="text-[8px] text-muted uppercase">Score</div>
        </div>

        {/* Address + Classification */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-gray-300">{truncAddr}</span>
            {cls && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${colors.bg} ${colors.text} ${colors.border}`}>
                {cls}
              </span>
            )}
            {candidate.score?.is_suspicious_insider && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-bold">
                Insider Flag
              </span>
            )}
            {candidate.is_already_tracked && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue border border-accent-blue/20 uppercase">
                Tracked
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="text-muted">
              WR: <span className={`font-bold ${candidate.win_rate >= 0.6 ? 'text-accent-green' : 'text-gray-400'}`}>
                {(candidate.win_rate * 100).toFixed(1)}%
              </span>
            </span>
            <span className="text-muted">
              ROI: <span className={`font-bold ${candidate.roi >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {(candidate.roi * 100).toFixed(1)}%
              </span>
            </span>
            <span className="text-muted">
              Trades: <span className="text-gray-400">{candidate.trade_count}</span>
            </span>
            <span className="text-muted">
              Vol: <span className="text-gray-400">${(candidate.total_volume / 1000).toFixed(1)}K</span>
            </span>
            <span className="text-muted">
              Markets: <span className="text-gray-400">{candidate.fingerprint.unique_markets}</span>
            </span>
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {!candidate.is_already_tracked ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAdd(candidate); }}
              disabled={adding}
              className="px-3 py-1.5 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-[10px] font-bold hover:bg-accent-green/20 disabled:opacity-50 transition-colors"
            >
              {adding ? 'Adding...' : 'Track'}
            </button>
          ) : (
            <span className="text-[10px] text-accent-blue">Tracking</span>
          )}
        </div>

        <span className={`text-muted transition-transform ${expanded ? 'rotate-90' : ''}`}>▸</span>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border-card">
          {/* Classification reasoning */}
          {candidate.classification_reasoning && (
            <div className="mb-3">
              <div className="text-[10px] text-accent-green uppercase tracking-wider mb-1 font-bold">Claude Classification</div>
              <p className="text-xs text-gray-300">{candidate.classification_reasoning}</p>
            </div>
          )}

          {/* Fingerprint Details */}
          <div className="grid grid-cols-4 gap-3 text-[10px]">
            <div>
              <span className="text-muted block">Buy/Sell</span>
              <span className="text-gray-300">{candidate.fingerprint.buy_count}B / {candidate.fingerprint.sell_count}S</span>
            </div>
            <div>
              <span className="text-muted block">Avg Size</span>
              <span className="text-gray-300">${candidate.fingerprint.avg_position_size.toFixed(0)}</span>
            </div>
            <div>
              <span className="text-muted block">Median Gap</span>
              <span className={`${candidate.fingerprint.median_time_between_trades_seconds < 5 ? 'text-accent-red' : 'text-gray-300'}`}>
                {candidate.fingerprint.median_time_between_trades_seconds.toFixed(0)}s
              </span>
            </div>
            <div>
              <span className="text-muted block">Round Sizes</span>
              <span className={`${candidate.fingerprint.pct_round_sizes > 0.7 ? 'text-accent-red' : 'text-gray-300'}`}>
                {(candidate.fingerprint.pct_round_sizes * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-muted block">Both Sides</span>
              <span className={`${candidate.fingerprint.pct_both_sides > 0.4 ? 'text-accent-yellow' : 'text-gray-300'}`}>
                {(candidate.fingerprint.pct_both_sides * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-muted block">Directional</span>
              <span className="text-gray-300">{(candidate.fingerprint.directional_ratio * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-muted block">Win Streak</span>
              <span className={`${candidate.fingerprint.longest_win_streak >= 8 ? 'text-accent-green font-bold' : 'text-gray-300'}`}>
                {candidate.fingerprint.longest_win_streak}
              </span>
            </div>
            <div>
              <span className="text-muted block">Active Hours</span>
              <span className={`${candidate.fingerprint.active_hours.length >= 20 ? 'text-accent-red' : 'text-gray-300'}`}>
                {candidate.fingerprint.active_hours.length}/24h
              </span>
            </div>
          </div>

          {/* Category concentration */}
          {Object.keys(candidate.fingerprint.category_concentration).length > 0 && (
            <div className="mt-2">
              <span className="text-[10px] text-muted">Categories: </span>
              {Object.entries(candidate.fingerprint.category_concentration)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => (
                  <span key={cat} className="text-[10px] text-gray-400 mr-2">
                    {cat}: <span className="text-gray-300">{count}</span>
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-border-card rounded-lg bg-bg-card p-3">
      <div className="text-[9px] text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
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
