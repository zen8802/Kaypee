import fs from 'fs';
import path from 'path';
import { Settings, Trade, Market, Analysis, TrackedWallet, CopyTrade, WalletSignal } from './types';

const DATA_DIR = path.join(process.cwd(), '.data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TRADES_FILE = path.join(DATA_DIR, 'trades.json');
const MARKETS_FILE = path.join(DATA_DIR, 'markets.json');
const ANALYSES_FILE = path.join(DATA_DIR, 'analyses.json');

const WALLETS_FILE = path.join(DATA_DIR, 'wallets.json');
const COPY_TRADES_FILE = path.join(DATA_DIR, 'copy-trades.json');
const SIGNALS_FILE = path.join(DATA_DIR, 'signals.json');

const DEFAULT_SETTINGS: Settings = {
  kalshi_api_key: '',
  kalshi_api_secret: '',
  polymarket_api_key: '',
  claude_api_key: '',
  bankroll: 10000,
  min_edge_score: 15,
  kelly_fraction: 0.25,
  max_position_pct: 0.05,
  categories: ['sports', 'politics', 'economics', 'crypto', 'weather'],
  scan_interval_minutes: 15,
  wallet_poll_interval_seconds: 60,
  wallet_auto_execute: false,
  wallet_min_score: 0.65,
  wallet_max_copy_pct: 0.03,
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    ensureDir();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // corrupted file, return fallback
  }
  return fallback;
}

function writeJson<T>(filePath: string, data: T): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Settings
export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(SETTINGS_FILE, {}) };
}

export function saveSettings(settings: Partial<Settings>): Settings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  writeJson(SETTINGS_FILE, updated);
  return updated;
}

// Trades
export function getTrades(): Trade[] {
  return readJson<Trade[]>(TRADES_FILE, []);
}

export function addTrade(trade: Trade): void {
  const trades = getTrades();
  trades.push(trade);
  writeJson(TRADES_FILE, trades);
}

// Markets
export function getMarkets(): Market[] {
  return readJson<Market[]>(MARKETS_FILE, []);
}

export function saveMarkets(markets: Market[]): void {
  writeJson(MARKETS_FILE, markets);
}

// Analyses
export function getAnalyses(): Analysis[] {
  return readJson<Analysis[]>(ANALYSES_FILE, []);
}

export function saveAnalyses(analyses: Analysis[]): void {
  writeJson(ANALYSES_FILE, analyses);
}

// Last scan timestamp
export function getLastScan(): string | null {
  const data = readJson<{ last_scan: string | null }>(path.join(DATA_DIR, 'meta.json'), { last_scan: null });
  return data.last_scan;
}

export function setLastScan(ts: string): void {
  writeJson(path.join(DATA_DIR, 'meta.json'), { last_scan: ts });
}

// Tracked Wallets
export function getWallets(): TrackedWallet[] {
  return readJson<TrackedWallet[]>(WALLETS_FILE, []);
}

export function saveWallets(wallets: TrackedWallet[]): void {
  writeJson(WALLETS_FILE, wallets);
}

export function getWallet(address: string): TrackedWallet | undefined {
  return getWallets().find((w) => w.address.toLowerCase() === address.toLowerCase());
}

export function upsertWallet(wallet: TrackedWallet): void {
  const wallets = getWallets();
  const idx = wallets.findIndex((w) => w.address.toLowerCase() === wallet.address.toLowerCase());
  if (idx >= 0) {
    wallets[idx] = wallet;
  } else {
    wallets.push(wallet);
  }
  saveWallets(wallets);
}

export function removeWallet(address: string): void {
  const wallets = getWallets().filter((w) => w.address.toLowerCase() !== address.toLowerCase());
  saveWallets(wallets);
}

// Copy Trades
export function getCopyTrades(): CopyTrade[] {
  return readJson<CopyTrade[]>(COPY_TRADES_FILE, []);
}

export function addCopyTrade(trade: CopyTrade): void {
  const trades = getCopyTrades();
  trades.push(trade);
  writeJson(COPY_TRADES_FILE, trades);
}

export function saveCopyTrades(trades: CopyTrade[]): void {
  writeJson(COPY_TRADES_FILE, trades);
}

// Wallet Signals (active alerts)
export function getSignals(): WalletSignal[] {
  return readJson<WalletSignal[]>(SIGNALS_FILE, []);
}

export function saveSignals(signals: WalletSignal[]): void {
  writeJson(SIGNALS_FILE, signals);
}

export function addSignal(signal: WalletSignal): void {
  const signals = getSignals();
  signals.push(signal);
  writeJson(SIGNALS_FILE, signals);
}

export function updateSignalStatus(id: string, status: WalletSignal['status']): void {
  const signals = getSignals();
  const idx = signals.findIndex((s) => s.id === id);
  if (idx >= 0) {
    signals[idx].status = status;
    writeJson(SIGNALS_FILE, signals);
  }
}
