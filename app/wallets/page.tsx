'use client';

import { useEffect, useState, useCallback } from 'react';
import Navigation from '../components/Navigation';
import WalletCard from '../components/WalletCard';
import WalletSignalAlert from '../components/WalletSignalAlert';
import { TrackedWallet, WalletSignal } from '../lib/types';

interface WalletData {
  wallets: TrackedWallet[];
  active_alerts: number;
  pending_signals: WalletSignal[];
}

export default function WalletsPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addAddress, setAddAddress] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanElapsed, setScanElapsed] = useState(0);
  const [scanResult, setScanResult] = useState<{ wallets_scanned: number; new_signals: number } | null>(null);
  const [executingSignal, setExecutingSignal] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    fetch('/api/wallets')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addWallet = async () => {
    if (!addAddress.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addAddress.trim(), label: addLabel.trim() || undefined }),
      });
      const result = await res.json();
      if (result.error) {
        setAddError(result.error);
      } else {
        setAddAddress('');
        setAddLabel('');
        if (result.bot_warning) {
          setAddError('Warning: This wallet shows bot-like trading patterns.');
        }
        fetchData();
      }
    } catch {
      setAddError('Failed to add wallet');
    } finally {
      setAdding(false);
    }
  };

  const togglePause = async (address: string, paused: boolean) => {
    await fetch(`/api/wallets/${address}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused }),
    });
    fetchData();
  };

  const runScan = async () => {
    setScanning(true);
    setScanResult(null);
    setScanElapsed(0);
    const timer = setInterval(() => setScanElapsed((s) => s + 1), 1000);
    try {
      const res = await fetch('/api/wallets/scan', { method: 'POST' });
      const result = await res.json();
      if (!result.error) {
        setScanResult(result);
        fetchData();
      }
    } catch { /* ignore */ }
    finally {
      clearInterval(timer);
      setScanning(false);
    }
  };

  const executeSignal = async (signalId: string) => {
    setExecutingSignal(signalId);
    try {
      await fetch('/api/copy-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal_id: signalId }),
      });
      fetchData();
    } catch { /* ignore */ }
    finally {
      setExecutingSignal(null);
    }
  };

  const dismissSignal = async () => {
    // In production this would call a dedicated dismiss endpoint
    fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <div className="text-accent-green text-2xl mb-4 animate-pulse">◆</div>
            <div className="text-sm text-muted">Loading wallets...</div>
          </div>
        </div>
      </div>
    );
  }

  const wallets = data?.wallets ?? [];
  const signals = data?.pending_signals ?? [];

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-gray-200">Wallet Tracker</h1>
            <p className="text-xs text-muted mt-0.5">Track Polymarket wallets, detect smart money, copy trade on Kalshi</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted">{wallets.length} tracked</span>
            {signals.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20 font-bold">
                {signals.length} alert{signals.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Add Wallet */}
        <div className="border border-border-card rounded-lg bg-bg-card p-4 mb-6">
          <div className="text-[10px] text-accent-green uppercase tracking-wider font-bold mb-3">Add Wallet</div>
          <div className="flex gap-3">
            <input
              type="text"
              value={addAddress}
              onChange={(e) => setAddAddress(e.target.value)}
              placeholder="0x... Polymarket wallet address"
              className="flex-1 bg-bg-primary border border-border-card rounded px-3 py-2.5 text-xs text-gray-200 placeholder-muted focus:outline-none focus:border-accent-green/40 font-mono"
            />
            <input
              type="text"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-48 bg-bg-primary border border-border-card rounded px-3 py-2.5 text-xs text-gray-200 placeholder-muted focus:outline-none focus:border-accent-green/40"
            />
            <button
              onClick={addWallet}
              disabled={adding || !addAddress.trim()}
              className="px-5 py-2.5 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-xs font-bold hover:bg-accent-green/20 disabled:opacity-30 transition-colors"
            >
              {adding ? 'Adding...' : 'Track'}
            </button>
          </div>
          {addError && <div className="text-xs text-accent-red mt-2">{addError}</div>}
        </div>

        {/* Scan Panel */}
        {wallets.length > 0 && (
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
                  {scanning ? 'Scanning...' : 'Scan All Wallets'}
                </button>
                {scanning && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-yellow animate-pulse-dot" />
                    Checking positions...
                    <span className="text-[10px] font-mono text-muted">{scanElapsed}s</span>
                  </div>
                )}
                {!scanning && scanResult && (
                  <span className="text-xs text-accent-green">
                    ✓ {scanResult.wallets_scanned} scanned, {scanResult.new_signals} new signal{scanResult.new_signals !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Signals */}
        {signals.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] text-accent-yellow uppercase tracking-wider font-bold mb-3">
              Active Signals ({signals.length})
            </div>
            <div className="space-y-2">
              {signals.map((signal) => (
                <WalletSignalAlert
                  key={signal.id}
                  signal={signal}
                  onExecute={executeSignal}
                  onDismiss={dismissSignal}
                  executing={executingSignal === signal.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Wallet List */}
        <div className="mb-4">
          <div className="text-[10px] text-muted uppercase tracking-wider font-bold mb-3">
            Tracked Wallets ({wallets.length})
          </div>
        </div>

        {wallets.length > 0 ? (
          <div className="space-y-2">
            {wallets
              .sort((a, b) => (b.score?.composite ?? 0) - (a.score?.composite ?? 0))
              .map((wallet) => (
                <WalletCard key={wallet.address} wallet={wallet} onTogglePause={togglePause} />
              ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-border-card rounded-lg bg-bg-card">
            <div className="text-muted text-2xl mb-3">⟐</div>
            <div className="text-sm text-gray-400 mb-1">No wallets tracked yet</div>
            <p className="text-xs text-muted">
              Add a Polymarket wallet address above to start tracking.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
