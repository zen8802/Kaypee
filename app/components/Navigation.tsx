'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const arbitrageItems = [
  { href: '/', label: 'Dashboard', icon: '◈' },
  { href: '/analyze', label: 'Analyzer', icon: '⟐' },
  { href: '/trades', label: 'Trades', icon: '⟁' },
];

const walletItems = [
  { href: '/wallets', label: 'Wallets', icon: '◇', showBadge: true },
  { href: '/wallets/discover', label: 'Discover', icon: '⊕' },
  { href: '/copy-trades', label: 'Copy Trades', icon: '⧫' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const fetchAlerts = () => {
      fetch('/api/wallets')
        .then((r) => r.json())
        .then((d) => setAlertCount(d.active_alerts || 0))
        .catch(() => {});
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const navLink = (item: { href: string; label: string; icon: string; showBadge?: boolean }) => {
    const isActive = item.href === '/'
      ? pathname === '/'
      : item.href === '/wallets'
        ? pathname === '/wallets' || (pathname.startsWith('/wallets/') && !pathname.startsWith('/wallets/discover'))
        : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
          isActive
            ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
            : 'text-muted hover:text-gray-300 hover:bg-bg-hover'
        }`}
      >
        <span>{item.icon}</span>
        {item.label}
        {item.showBadge && alertCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent-yellow/20 text-accent-yellow text-[9px] font-bold leading-none">
            {alertCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className="border-b border-border-card bg-bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-accent-green text-lg font-bold">◆</span>
              <span className="text-sm font-bold tracking-wider text-gray-200">
                RAE
              </span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
              v2.0
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Resolution Arbitrage Group */}
            <div className="flex items-center gap-1 mr-2">
              {arbitrageItems.map(navLink)}
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-border-card mx-1" />

            {/* Wallet Tracker Group */}
            <div className="flex items-center gap-1 ml-2">
              {walletItems.map(navLink)}
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-border-card mx-1" />

            {/* Settings */}
            <Link
              href="/settings"
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ml-1 ${
                pathname === '/settings'
                  ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                  : 'text-muted hover:text-gray-300 hover:bg-bg-hover'
              }`}
            >
              <span>⚙</span>
              Settings
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-dot" />
              <span className="text-[10px] text-accent-green">LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
