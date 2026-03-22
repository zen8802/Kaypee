'use client';

import Link from 'next/link';
import { TrackedWallet } from '../lib/types';

interface Props {
  wallet: TrackedWallet;
  onTogglePause: (address: string, paused: boolean) => void;
}

function scoreColor(score: number, suspicious: boolean): string {
  if (suspicious) return 'text-purple-400';
  if (score >= 0.65) return 'text-accent-green';
  if (score >= 0.4) return 'text-accent-yellow';
  return 'text-accent-red';
}

function scoreBg(score: number, suspicious: boolean): string {
  if (suspicious) return 'bg-purple-500/10 border-purple-500/20';
  if (score >= 0.65) return 'bg-accent-green/10 border-accent-green/20';
  if (score >= 0.4) return 'bg-accent-yellow/10 border-accent-yellow/20';
  return 'bg-accent-red/10 border-accent-red/20';
}

export default function WalletCard({ wallet, onTogglePause }: Props) {
  const score = wallet.score?.composite ?? 0;
  const suspicious = wallet.score?.is_suspicious_insider ?? false;
  const truncAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;

  return (
    <div className={`border rounded-lg p-4 card-hover ${wallet.paused ? 'border-border-card bg-bg-card opacity-60' : 'border-border-card bg-bg-card'}`}>
      <div className="flex items-center gap-4">
        {/* Score Badge */}
        <div className={`flex-shrink-0 w-16 h-16 rounded-lg border flex flex-col items-center justify-center ${scoreBg(score, suspicious)}`}>
          <div className={`text-xl font-bold ${scoreColor(score, suspicious)}`}>
            {wallet.score ? score.toFixed(2) : '—'}
          </div>
          <div className="text-[8px] text-muted uppercase tracking-wider">
            {suspicious ? 'INSIDER?' : 'Score'}
          </div>
        </div>

        {/* Wallet Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-200">{wallet.label}</span>
            {wallet.paused && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/10 text-muted border border-muted/20 uppercase">Paused</span>
            )}
            {suspicious && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">Insider Flag</span>
            )}
          </div>
          <div className="text-[10px] font-mono text-muted">{truncAddr}</div>
          <div className="flex items-center gap-4 mt-1.5 text-[10px]">
            {wallet.score && (
              <>
                <span className="text-muted">
                  Win Rate: <span className={`font-bold ${wallet.score.win_rate >= 0.6 ? 'text-accent-green' : 'text-accent-yellow'}`}>
                    {(wallet.score.win_rate * 100).toFixed(1)}%
                  </span>
                </span>
                <span className="text-muted">
                  ROI: <span className={`font-bold ${wallet.score.roi >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {(wallet.score.roi * 100).toFixed(1)}%
                  </span>
                </span>
                <span className="text-muted">
                  Trades: <span className="text-gray-400">{wallet.score.sample_size}</span>
                </span>
                <span className="text-muted">
                  Timing: <span className="text-gray-400">{wallet.score.avg_timing_hours.toFixed(0)}h</span>
                </span>
              </>
            )}
            {!wallet.score && (
              <span className="text-muted">
                {wallet.trade_count} trades found — need 10+ resolved to score
              </span>
            )}
          </div>
        </div>

        {/* Active Positions */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xs text-muted mb-0.5">Active Positions</div>
          <div className="text-lg font-bold text-gray-200">{wallet.active_positions.length}</div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <Link
            href={`/wallets/${wallet.address}`}
            className="px-3 py-1.5 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-[10px] font-bold hover:bg-accent-green/20 transition-colors"
          >
            View
          </Link>
          <button
            onClick={() => onTogglePause(wallet.address, !wallet.paused)}
            className="px-3 py-1.5 bg-bg-hover text-muted border border-border-card rounded text-[10px] font-bold hover:text-gray-300 transition-colors"
          >
            {wallet.paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>
    </div>
  );
}
