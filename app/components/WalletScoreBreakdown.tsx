'use client';

import { WalletScoreBreakdown as ScoreBreakdown } from '../lib/types';

interface Props {
  score: ScoreBreakdown;
}

function barWidth(value: number): string {
  return `${Math.min(100, Math.max(0, value * 100))}%`;
}

function barColor(value: number): string {
  if (value >= 0.65) return 'bg-accent-green';
  if (value >= 0.4) return 'bg-accent-yellow';
  return 'bg-accent-red';
}

export default function WalletScoreBreakdownComponent({ score }: Props) {
  const dimensions = [
    {
      label: 'Win Rate',
      raw: `${(score.win_rate * 100).toFixed(1)}%`,
      weight: '× 0.4',
      value: score.win_rate,
      weighted: score.win_rate_weighted,
    },
    {
      label: 'ROI Score',
      raw: `${(score.roi * 100).toFixed(1)}% ROI → ${score.roi_score.toFixed(2)}`,
      weight: '× 0.3',
      value: score.roi_score,
      weighted: score.roi_weighted,
    },
    {
      label: 'Timing Score',
      raw: `${score.avg_timing_hours.toFixed(0)}h avg → ${score.timing_score.toFixed(2)}`,
      weight: '× 0.2',
      value: score.timing_score,
      weighted: score.timing_weighted,
    },
    {
      label: 'Sample Size',
      raw: `${score.sample_size} trades → ${score.sample_size_score.toFixed(2)}`,
      weight: '× 0.1',
      value: score.sample_size_score,
      weighted: score.sample_size_weighted,
    },
  ];

  return (
    <div className="border border-border-card rounded-lg bg-bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] text-muted uppercase tracking-wider font-bold">Score Breakdown</div>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${
            score.is_suspicious_insider ? 'text-purple-400' :
            score.composite >= 0.65 ? 'text-accent-green' :
            score.composite >= 0.4 ? 'text-accent-yellow' : 'text-accent-red'
          }`}>
            {score.composite.toFixed(3)}
          </span>
          {score.is_suspicious_insider && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-bold">
              Insider Flag
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {dimensions.map((dim) => (
          <div key={dim.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">{dim.label}</span>
                <span className="text-[9px] text-muted font-mono">{dim.weight}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted">{dim.raw}</span>
                <span className="text-xs font-mono font-bold text-gray-200">
                  {dim.weighted.toFixed(3)}
                </span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-bg-primary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor(dim.value)}`}
                style={{ width: barWidth(dim.value) }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Composite bar */}
      <div className="mt-4 pt-3 border-t border-border-card">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-gray-200">Composite Score</span>
          <span className="text-xs font-mono font-bold text-gray-200">
            {score.composite.toFixed(3)}
          </span>
        </div>
        <div className="w-full h-2 bg-bg-primary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              score.is_suspicious_insider ? 'bg-purple-400' : barColor(score.composite)
            }`}
            style={{ width: barWidth(score.composite) }}
          />
        </div>
      </div>
    </div>
  );
}
