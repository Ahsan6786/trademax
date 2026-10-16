import React, { useState, useEffect } from 'react';
import TradingViewWidget from '../dashboard/TradingViewWidget';
import './StocksPage.css';

const POPULAR_SYMBOLS = [
  { label: 'BTC/USDT', symbol: 'BINANCE:BTCUSDT', category: 'Crypto' },
  { label: 'ETH/USDT', symbol: 'BINANCE:ETHUSDT', category: 'Crypto' },
  { label: 'GOLD', symbol: 'TVC:GOLD', category: 'Commodities' },
  { label: 'AAPL', symbol: 'NASDAQ:AAPL', category: 'Stocks' },
  { label: 'TSLA', symbol: 'NASDAQ:TSLA', category: 'Stocks' },
  { label: 'S&P 500', symbol: 'FOREXCOM:SPXUSD', category: 'Indices' },
  { label: 'EUR/USD', symbol: 'FX:EURUSD', category: 'Forex' },
];

export const StocksPage = ({
  onBack,
  onNavigate,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState('BINANCE:BTCUSDT');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  return (
    <div className={`tm-stocks-page-root tm-theme-${theme}`}>
      {/* Top Header: Black in Night Mode, White in Day Mode */}
      <header className="tm-stocks-header">
        <div className="tm-stocks-header-left">
          <button
            type="button"
            className="tm-stocks-back-btn"
            onClick={onBack || (() => onNavigate && onNavigate('landing'))}
            aria-label="Back to Home"
          >
            <span aria-hidden="true">&larr;</span>
            <span className="tm-stocks-back-text">Back</span>
          </button>

          <div className="tm-stocks-branding">
            <span className="tm-stocks-title">Live Trading Terminal</span>
            <span className="tm-stocks-subtitle">TradingView Institutional Charts</span>
          </div>
        </div>

        <div className="tm-stocks-header-right">
          {onToggleTheme && (
            <button
              type="button"
              className="tm-stocks-theme-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Day' : 'Night'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? 'DAY' : 'NIGHT'}
            </button>
          )}
        </div>
      </header>

      {/* Symbol Quick-Switcher Watchlist Bar */}
      <div className="tm-stocks-ticker-bar">
        <div className="tm-stocks-ticker-label">Watchlist:</div>
        <div className="tm-stocks-pills">
          {POPULAR_SYMBOLS.map((item) => {
            const isActive = selectedSymbol === item.symbol;
            return (
              <button
                key={item.symbol}
                type="button"
                className={`tm-stocks-pill ${isActive ? 'is-active' : ''}`}
                onClick={() => setSelectedSymbol(item.symbol)}
              >
                <span className="tm-stocks-pill-name">{item.label}</span>
                <span className="tm-stocks-pill-cat">{item.category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main TradingView Advanced Chart Area: 100% full fit */}
      <main className="tm-stocks-chart-container">
        <TradingViewWidget
          key={`${selectedSymbol}-${theme}`}
          symbol={selectedSymbol}
          theme={theme}
        />
      </main>

    </div>
  );
};

export default StocksPage;
