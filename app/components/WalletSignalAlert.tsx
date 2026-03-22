'use client';

import { WalletSignal } from '../lib/types';

interface Props {
  signal: WalletSignal;
  onExecute: (signalId: string) => void;
  onDismiss: (signalId: string) => void;
  executing: boolean;
}

export default function WalletSignalAlert({ signal, onExecute, onDismiss, executing }: Props) {
  const hasMatch = signal.kalshi_match !== null;
  const confidence = signal.kalshi_match?.match_confidence;

  return (
    <div className="border border-accent-yellow/30 rounded-lg bg-accent-yellow/5 p-4 card-hover">
      <div className="flex items-start gap-4">
        {/* Alert Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <span className="inline-block w-2 h-2 rounded-full bg-accent-yellow animate-pulse-dot" />
        </div>

        {/* Signal Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-accent-yellow uppercase">New Signal</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-bg-hover text-muted border border-border-card font-mono">
              {signal.wallet_label}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
              signal.wallet_score >= 0.65
                ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                : 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20'
            }`}>
              Score: {signal.wallet_score.toFixed(2)}
            </span>
          </div>

          {/* Polymarket Side */}
          <div className="mb-2">
            <div className="text-[9px] text-muted uppercase tracking-wider mb-0.5">Polymarket Signal</div>
            <div className="text-xs text-gray-200">{signal.polymarket_title}</div>
            <div className="flex items-center gap-3 mt-1 text-[10px]">
              <span className="text-muted">
                Direction: <span className={`font-bold ${signal.direction === 'YES' ? 'text-accent-green' : 'text-accent-red'}`}>
                  {signal.direction}
                </span>
              </span>
              <span className="text-muted">
                Price: <span className="text-gray-400">{(signal.signal_price * 100).toFixed(0)}¢</span>
              </span>
              <span className="text-muted">
                Size: <span className="text-gray-400">${signal.signal_size.toFixed(0)}</span>
              </span>
            </div>
          </div>

          {/* Kalshi Match */}
          {hasMatch ? (
            <div className="p-2 bg-bg-primary rounded border border-border-card">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] text-accent-blue uppercase tracking-wider font-bold">Kalshi Match</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                  confidence === 'HIGH' ? 'bg-accent-green/10 text-accent-green border-accent-green/20' :
                  confidence === 'MEDIUM' ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20' :
                  'bg-accent-red/10 text-accent-red border-accent-red/20'
                }`}>
                  {confidence}
                </span>
              </div>
              <div className="text-xs text-gray-300">{signal.kalshi_match!.kalshi_title}</div>
              <div className="flex items-center gap-3 mt-1 text-[10px]">
                <span className="text-muted">
                  Ticker: <span className="text-gray-400 font-mono">{signal.kalshi_match!.kalshi_ticker}</span>
                </span>
                <span className="text-muted">
                  YES: <span className="text-accent-green">{(signal.kalshi_match!.kalshi_yes_price * 100).toFixed(0)}¢</span>
                </span>
                <span className="text-muted">
                  NO: <span className="text-accent-red">{(signal.kalshi_match!.kalshi_no_price * 100).toFixed(0)}¢</span>
                </span>
                {signal.kelly_size && (
                  <span className="text-muted">
                    Kelly: <span className="text-accent-green font-bold">${signal.kelly_size.toFixed(0)}</span>
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted mt-1">{signal.kalshi_match!.match_reasoning}</div>
            </div>
          ) : (
            <div className="p-2 bg-bg-primary rounded border border-border-card">
              <span className="text-[10px] text-muted">No Kalshi match found — manual review needed</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          {hasMatch && (
            <button
              onClick={() => onExecute(signal.id)}
              disabled={executing}
              className="px-4 py-2 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-[10px] font-bold hover:bg-accent-green/20 disabled:opacity-50 transition-colors"
            >
              {executing ? 'Executing...' : 'Execute'}
            </button>
          )}
          <button
            onClick={() => onDismiss(signal.id)}
            className="px-4 py-2 bg-bg-hover text-muted border border-border-card rounded text-[10px] font-bold hover:text-gray-300 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
