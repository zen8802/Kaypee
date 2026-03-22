'use client';

import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { Settings, MarketCategory } from '../lib/types';

const ALL_CATEGORIES: MarketCategory[] = ['sports', 'politics', 'economics', 'crypto', 'weather'];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key: keyof Settings, value: unknown) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const toggleCategory = (cat: MarketCategory) => {
    if (!settings) return;
    const cats = settings.categories.includes(cat)
      ? settings.categories.filter((c) => c !== cat)
      : [...settings.categories, cat];
    update('categories', cats);
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-sm text-muted">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold text-gray-200">Settings</h1>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-xs font-bold hover:bg-accent-green/20 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        <div className="space-y-6">
          {/* API Keys */}
          <Section title="API Keys">
            <div className="space-y-3">
              <InputField
                label="Claude API Key"
                value={settings.claude_api_key}
                onChange={(v) => update('claude_api_key', v)}
                type="password"
                placeholder="sk-ant-..."
              />
              <InputField
                label="Kalshi Email"
                value={settings.kalshi_api_key}
                onChange={(v) => update('kalshi_api_key', v)}
                placeholder="your@email.com"
              />
              <InputField
                label="Kalshi Password"
                value={settings.kalshi_api_secret}
                onChange={(v) => update('kalshi_api_secret', v)}
                type="password"
                placeholder="password"
              />
              <InputField
                label="Polymarket API Key"
                value={settings.polymarket_api_key}
                onChange={(v) => update('polymarket_api_key', v)}
                type="password"
                placeholder="Optional — public markets don't require auth"
              />
            </div>
          </Section>

          {/* Position Sizing */}
          <Section title="Position Sizing">
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Bankroll ($)"
                value={settings.bankroll}
                onChange={(v) => update('bankroll', v)}
                min={0}
              />
              <NumberField
                label="Kelly Fraction"
                value={settings.kelly_fraction}
                onChange={(v) => update('kelly_fraction', v)}
                min={0}
                max={1}
                step={0.05}
                hint="0.25 = quarter Kelly (recommended)"
              />
              <NumberField
                label="Max Position (%)"
                value={settings.max_position_pct}
                onChange={(v) => update('max_position_pct', v)}
                min={0.01}
                max={0.20}
                step={0.01}
                hint="Max % of bankroll per trade"
              />
              <NumberField
                label="Min Edge Score"
                value={settings.min_edge_score}
                onChange={(v) => update('min_edge_score', v)}
                min={0}
                max={100}
                step={1}
                hint="Only show opportunities above this"
              />
            </div>
          </Section>

          {/* Scanning */}
          <Section title="Scanning">
            <NumberField
              label="Scan Interval (minutes)"
              value={settings.scan_interval_minutes}
              onChange={(v) => update('scan_interval_minutes', v)}
              min={5}
              max={60}
              step={5}
            />
          </Section>

          {/* Categories */}
          <Section title="Categories to Scan">
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                    settings.categories.includes(cat)
                      ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                      : 'bg-bg-hover text-muted border border-border-card hover:text-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </Section>

          {/* Wallet Tracker */}
          <Section title="Wallet Tracker">
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Polling Interval (seconds)"
                value={settings.wallet_poll_interval_seconds}
                onChange={(v) => update('wallet_poll_interval_seconds', v)}
                min={10}
                max={300}
                step={10}
                hint="How often to check for new positions"
              />
              <NumberField
                label="Min Smart Money Score"
                value={settings.wallet_min_score}
                onChange={(v) => update('wallet_min_score', v)}
                min={0}
                max={1}
                step={0.05}
                hint="Only alert for wallets above this score"
              />
              <NumberField
                label="Max Copy Trade Size (% of bankroll)"
                value={settings.wallet_max_copy_pct}
                onChange={(v) => update('wallet_max_copy_pct', v)}
                min={0.01}
                max={0.10}
                step={0.01}
                hint="Cap for individual copy trade sizing"
              />
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Auto-Execute Copy Trades</label>
                <button
                  onClick={() => update('wallet_auto_execute', !settings.wallet_auto_execute)}
                  className={`px-4 py-2 rounded text-xs font-bold transition-colors ${
                    settings.wallet_auto_execute
                      ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                      : 'bg-bg-hover text-muted border border-border-card hover:text-gray-300'
                  }`}
                >
                  {settings.wallet_auto_execute ? 'Enabled' : 'Disabled (Alert Only)'}
                </button>
                <div className="text-[10px] text-muted mt-1">
                  {settings.wallet_auto_execute
                    ? 'Signals will auto-execute on Kalshi when conditions met'
                    : 'You will be alerted and can execute manually'}
                </div>
              </div>
            </div>
          </Section>

          {/* Kelly Criterion Explanation */}
          <Section title="About Kelly Criterion">
            <div className="text-xs text-gray-400 space-y-2">
              <p>
                The Kelly Criterion determines optimal position sizing: <span className="font-mono text-accent-green">f* = (bp - q) / b</span>
              </p>
              <p>
                Where <span className="font-mono">b</span> = odds received, <span className="font-mono">p</span> = estimated win probability, <span className="font-mono">q</span> = 1-p
              </p>
              <p>
                We use <span className="text-accent-yellow font-bold">fractional Kelly</span> (default 25%) to reduce variance.
                Maximum position is capped at {(settings.max_position_pct * 100).toFixed(0)}% of bankroll.
              </p>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border-card rounded-lg bg-bg-card p-4">
      <div className="text-[10px] text-muted uppercase tracking-wider font-bold mb-3">{title}</div>
      {children}
    </div>
  );
}

function InputField({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-primary border border-border-card rounded px-3 py-2 text-xs text-gray-200 placeholder-muted focus:outline-none focus:border-accent-green/40 font-mono"
      />
    </div>
  );
}

function NumberField({
  label, value, onChange, min, max, step = 1, hint,
}: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full bg-bg-primary border border-border-card rounded px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-accent-green/40"
      />
      {hint && <div className="text-[10px] text-muted mt-1">{hint}</div>}
    </div>
  );
}
