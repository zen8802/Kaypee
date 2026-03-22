export type Platform = 'kalshi' | 'polymarket';
export type MarketCategory = 'sports' | 'politics' | 'economics' | 'crypto' | 'weather' | 'other';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type PredictedOutcome = 'YES' | 'NO' | 'UNCERTAIN';
export type TradeDirection = 'YES' | 'NO';

export interface Market {
  id: string;
  platform: Platform;
  market_id: string;
  title: string;
  resolution_rules: string;
  yes_price: number;
  no_price: number;
  volume: number;
  close_time: string;
  category: MarketCategory;
  url?: string;
  last_fetched: string;
}

export interface Analysis {
  id: string;
  market_id: string;
  resolution_certainty: number;
  predicted_outcome: PredictedOutcome;
  predicted_probability: number;
  reasoning: string;
  key_data_found: string;
  data_source: string;
  confidence_in_rules_reading: Confidence;
  edge_score: number;
  analyzed_at: string;
}

export interface Opportunity {
  market: Market;
  analysis: Analysis;
  kelly_fraction: number;
  recommended_size: number;
  estimated_profit: number;
}

export interface Trade {
  id: string;
  market_id: string;
  market_title: string;
  platform: Platform;
  category: MarketCategory;
  direction: TradeDirection;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  ai_reasoning: string;
  ai_certainty: number;
  ai_edge_score: number;
  pnl: number | null;
  is_correct: boolean | null;
  status: 'open' | 'closed' | 'expired';
  opened_at: string;
  closed_at: string | null;
}

export interface Settings {
  kalshi_api_key: string;
  kalshi_api_secret: string;
  polymarket_api_key: string;
  claude_api_key: string;
  bankroll: number;
  min_edge_score: number;
  kelly_fraction: number;
  max_position_pct: number;
  categories: MarketCategory[];
  scan_interval_minutes: number;
  // Wallet tracker settings
  wallet_poll_interval_seconds: number;
  wallet_auto_execute: boolean;
  wallet_min_score: number;
  wallet_max_copy_pct: number;
}

export interface BankrollSnapshot {
  date: string;
  value: number;
}

export interface PortfolioStats {
  total_bankroll: number;
  total_pnl: number;
  win_rate: number;
  open_positions: number;
  total_trades: number;
  avg_edge_captured: number;
  bankroll_history: BankrollSnapshot[];
  pnl_by_category: Record<MarketCategory, number>;
  accuracy_by_category: Record<MarketCategory, { correct: number; total: number; rate: number }>;
}

// ============================================================
// Wallet Tracker Types
// ============================================================

export interface WalletTrade {
  market_slug: string;
  market_title: string;
  outcome: 'YES' | 'NO';
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  timestamp: string;
  resolved: boolean;
  resolution_outcome: 'YES' | 'NO' | null;
  pnl: number | null;
}

export interface WalletScoreBreakdown {
  win_rate: number;
  win_rate_weighted: number;       // × 0.4
  roi: number;
  roi_score: number;
  roi_weighted: number;            // × 0.3
  avg_timing_hours: number;
  timing_score: number;
  timing_weighted: number;         // × 0.2
  sample_size: number;
  sample_size_score: number;
  sample_size_weighted: number;    // × 0.1
  composite: number;
  is_suspicious_insider: boolean;
}

export interface TrackedWallet {
  address: string;
  label: string;
  added_at: string;
  paused: boolean;
  score: WalletScoreBreakdown | null;
  trade_count: number;
  last_scanned: string | null;
  trades: WalletTrade[];
  active_positions: WalletPosition[];
}

export interface WalletPosition {
  market_slug: string;
  market_title: string;
  outcome: 'YES' | 'NO';
  avg_price: number;
  size: number;
  current_price: number;
  opened_at: string;
}

export interface WalletSignal {
  id: string;
  wallet_address: string;
  wallet_label: string;
  wallet_score: number;
  polymarket_title: string;
  polymarket_slug: string;
  direction: 'YES' | 'NO';
  signal_price: number;
  signal_size: number;
  detected_at: string;
  kalshi_match: MarketMatch | null;
  kelly_size: number | null;
  status: 'pending' | 'executed' | 'dismissed';
}

export interface MarketMatch {
  kalshi_ticker: string;
  kalshi_title: string;
  kalshi_yes_price: number;
  kalshi_no_price: number;
  match_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  match_reasoning: string;
}

export interface CopyTrade {
  id: string;
  source_wallet: string;
  source_wallet_label: string;
  source_wallet_score: number;
  polymarket_title: string;
  polymarket_slug: string;
  poly_direction: 'YES' | 'NO';
  poly_signal_price: number;
  kalshi_ticker: string;
  kalshi_title: string;
  kalshi_direction: TradeDirection;
  entry_price: number;
  exit_price: number | null;
  position_size: number;
  match_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  pnl: number | null;
  is_correct: boolean | null;
  status: 'open' | 'closed' | 'expired';
  opened_at: string;
  closed_at: string | null;
}

// ============================================================
// Wallet Discovery Types
// ============================================================

export type WalletClassification = 'bot' | 'arb' | 'human-retail' | 'human-informed';

export interface DiscoveryCandidate {
  address: string;
  trade_count: number;
  total_volume: number;
  win_rate: number;
  roi: number;
  avg_timing_hours: number;
  score: WalletScoreBreakdown | null;
  classification: WalletClassification | null;
  classification_reasoning: string;
  is_already_tracked: boolean;
  fingerprint: TradeFingerprint;
}

export interface TradeFingerprint {
  total_trades: number;
  buy_count: number;
  sell_count: number;
  unique_markets: number;
  avg_position_size: number;
  median_time_between_trades_seconds: number;
  pct_round_sizes: number;
  pct_both_sides: number;
  active_hours: number[];
  category_concentration: Record<string, number>;
  longest_win_streak: number;
  avg_entry_before_close_hours: number;
  directional_ratio: number;
}
