'use client';

import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import MarketAnalyzer from '../components/MarketAnalyzer';
import { Settings } from '../lib/types';

export default function AnalyzePage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  const hasApiKey = settings?.claude_api_key;

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-lg font-bold text-gray-200 mb-1">Market Analyzer</h1>
          <p className="text-xs text-muted">
            Paste any Kalshi or Polymarket URL for full AI resolution analysis with live web search.
          </p>
        </div>

        {!hasApiKey && (
          <div className="border border-accent-yellow/20 rounded-lg bg-accent-yellow/5 p-6 mb-6 text-center">
            <div className="text-accent-yellow text-lg mb-2">⚙</div>
            <div className="text-sm text-gray-200 mb-1">Claude API Key Required</div>
            <p className="text-xs text-muted mb-3">
              Add your Claude API key in Settings to enable live AI analysis with web search.
            </p>
            <a href="/settings" className="inline-block px-4 py-2 bg-accent-green/10 text-accent-green border border-accent-green/20 rounded text-xs font-bold hover:bg-accent-green/20 transition-colors">
              Open Settings
            </a>
          </div>
        )}

        {/* URL Analyzer */}
        <div className="border border-border-card rounded-lg bg-bg-card p-4">
          <div className="text-[10px] text-accent-green uppercase tracking-wider font-bold mb-3">◈ Analyze Market URL</div>
          <MarketAnalyzer apiKey={settings?.claude_api_key} />
        </div>
      </main>
    </div>
  );
}
