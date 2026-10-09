import React, { useState, useEffect } from 'react';
import TradingViewWidget from './TradingViewWidget';
import './StudentDashboard.css';

const SUPPORTED_SYMBOLS = [
  { symbol: 'NASDAQ:AAPL', label: 'AAPL', name: 'Apple Inc.', supported: true },
  { symbol: 'NASDAQ:QQQ', label: 'QQQ', name: 'Nasdaq 100 ETF', supported: true },
  { symbol: 'NASDAQ:NVDA', label: 'NVDA', name: 'NVIDIA Corp.', supported: true },
  { symbol: 'AMEX:SPY', label: 'SPY', name: 'S&P 500 ETF', supported: true },
  { symbol: 'FX:USDINR', label: 'USD/INR', name: 'USD to INR Forex', supported: true },
  { symbol: 'TVC:GOLD', label: 'GOLD', name: 'Gold Spot', supported: true },
  { symbol: 'BINANCE:BTCUSDT', label: 'BTC/USDT', name: 'Bitcoin', supported: true },
  { symbol: 'NSE:NIFTY', label: 'NIFTY 50', name: 'NSE India (Exchange Restricted)', supported: false },
];

export const StudentDashboard = ({ user, onExit, onLogout }) => {
  const [activeTab, setActiveTab] = useState('charts'); // 'charts' | 'curriculum' | 'intel'
  const [selectedSymbol, setSelectedSymbol] = useState('NASDAQ:AAPL');

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  const studentName = user?.name || '';
  const isUnsupported = selectedSymbol.startsWith('NSE:') || selectedSymbol.startsWith('BSE:');

  const handleSelectSymbol = (sym) => {
    setSelectedSymbol(sym);
  };

  return (
    <div className="tm-dashboard-root">
      {/* Clean Top Navigation Bar */}
      <header className="tm-dashboard-header">
        <div className="tm-dashboard-header-inner">
          {/* Top Bar Wrapper: On mobile, brand & actions share row 1; on desktop, contents flatten */}
          <div className="tm-dashboard-top-bar">
            {/* Brand Logo & Portal Title */}
            <div className="tm-dashboard-brand">
              <button
                type="button"
                className="tm-dashboard-brand-btn"
                onClick={onExit}
                title="Return to TRADEMAX Homepage"
              >
                <img src="/tm-logo.png" alt="TRADEMAX" className="tm-dashboard-logo-img" />
              </button>
            </div>

            {/* Right Actions */}
            <div className="tm-dashboard-actions">
              {studentName && (
                <span className="tm-user-greeting">{studentName}</span>
              )}

              <button
                type="button"
                className="tm-btn-nav-outline"
                onClick={onExit}
              >
                Home
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Formatted Segmented Control for Desktop & Mobile) */}
          <nav className="tm-dashboard-tabs" role="tablist" aria-label="Student Navigation">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'charts'}
              className={`tm-dash-tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              <span className="tm-tab-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <span className="tm-tab-text">
                <span className="tm-tab-label-full">Trading Charts</span>
                <span className="tm-tab-label-short">Charts</span>
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'curriculum'}
              className={`tm-dash-tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
              onClick={() => setActiveTab('curriculum')}
            >
              <span className="tm-tab-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </span>
              <span className="tm-tab-text">
                <span className="tm-tab-label-full">Curriculum</span>
                <span className="tm-tab-label-short">Curriculum</span>
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'intel'}
              className={`tm-dash-tab-btn ${activeTab === 'intel' ? 'active' : ''}`}
              onClick={() => setActiveTab('intel')}
            >
              <span className="tm-tab-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </span>
              <span className="tm-tab-text">
                <span className="tm-tab-label-full">Market Intel</span>
                <span className="tm-tab-label-short">Intel</span>
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="tm-dashboard-main">
        {activeTab === 'charts' && (
          <section className="tm-charts-section" aria-label="Trading Charts Section">
            {/* Clean Section Header */}
            <div className="tm-charts-header">
              <div className="tm-charts-title-group">
                <h1 className="tm-charts-title">Trading Charts</h1>
              </div>
            </div>

            {/* Quick Market Symbol Selector */}
            <div className="tm-symbol-selector-wrap">
              <div className="tm-symbol-selector-label">
                <span>Select Market:</span>
              </div>
              <div className="tm-symbol-chips-scroll" role="tablist" aria-label="Market Symbols">
                {SUPPORTED_SYMBOLS.map((item) => {
                  const isActive = selectedSymbol === item.symbol;
                  return (
                    <button
                      key={item.symbol}
                      type="button"
                      className={`tm-symbol-chip ${isActive ? 'active' : ''} ${!item.supported ? 'restricted' : ''}`}
                      onClick={() => handleSelectSymbol(item.symbol)}
                      title={item.name}
                    >
                      <span className="tm-chip-label">{item.label}</span>
                      {!item.supported && (
                        <span className="tm-chip-restricted-dot" title="Exchange Restricted"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unsupported Symbol Explanation Banner */}
            {isUnsupported && (
              <div className="tm-symbol-warning-banner" role="alert">
                <div className="tm-warning-icon-wrap" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="tm-warning-text-content">
                  <div className="tm-warning-title">
                    {selectedSymbol} Exchange Data Notice
                  </div>
                  <p className="tm-warning-body">
                    The National Stock Exchange of India (NSE) enforces strict commercial data licensing policies that restrict free external iframe embedding, triggering the notice <em>"This symbol is only available on TradingView"</em>.
                  </p>
                  <p className="tm-warning-body tm-warning-hint">
                    To practice technical analysis directly in this dashboard, select any verified global instrument above (such as <strong>AAPL</strong>, <strong>QQQ</strong>, <strong>USD/INR</strong>, or <strong>Gold</strong>), or view {selectedSymbol} directly on TradingView.
                  </p>
                  <div className="tm-warning-actions">
                    <button
                      type="button"
                      className="tm-btn-switch-primary"
                      onClick={() => handleSelectSymbol('NASDAQ:AAPL')}
                    >
                      Load AAPL (Verified Supported)
                    </button>
                    <a
                      href={`https://www.tradingview.com/symbols/${selectedSymbol.replace(':', '-')}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tm-btn-external-link"
                    >
                      Open {selectedSymbol} on TradingView &rarr;
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TradingView Advanced Chart Container */}
            <div className="tm-chart-card">
              <div className="tm-chart-frame">
                <TradingViewWidget key={selectedSymbol} symbol={selectedSymbol} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'curriculum' && (
          <section className="tm-curriculum-section" aria-label="Curriculum Modules">
            <div className="tm-charts-header">
              <div className="tm-charts-title-group">
                <h1 className="tm-charts-title">Curriculum Modules</h1>
                <p className="tm-charts-subtitle">
                  Structured technical analysis pathways for disciplined traders.
                </p>
              </div>
              <button
                type="button"
                className="tm-btn-primary"
                onClick={() => setActiveTab('charts')}
              >
                Open Trading Charts
              </button>
            </div>

            <div className="tm-curriculum-grid">
              {[
                { id: 1, title: 'Module 01: Market Structure & Price Delivery', progress: '100% Completed', lessons: '8 Lessons', tag: 'Core' },
                { id: 2, title: 'Module 02: Liquidity Engineering & Order Blocks', progress: '75% In Progress', lessons: '12 Lessons', tag: 'Advanced' },
                { id: 3, title: 'Module 03: Multi-Timeframe Top-Down Analysis', progress: 'Ready to Start', lessons: '10 Lessons', tag: 'Analysis' },
                { id: 4, title: 'Module 04: Institutional Risk & Position Sizing', progress: 'Upcoming', lessons: '6 Lessons', tag: 'Discipline' },
              ].map((mod) => (
                <div key={mod.id} className="tm-module-card">
                  <div className="tm-module-card-top">
                    <span className="tm-module-tag">{mod.tag}</span>
                    <span className="tm-module-lessons">{mod.lessons}</span>
                  </div>
                  <h3 className="tm-module-title">{mod.title}</h3>
                  <div className="tm-module-card-bottom">
                    <span className="tm-module-progress">{mod.progress}</span>
                    <button
                      type="button"
                      className="tm-btn-outline-sm"
                      onClick={() => setActiveTab('charts')}
                    >
                      Practice on Chart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'intel' && (
          <section className="tm-intel-section" aria-label="Market Intel Overview">
            <div className="tm-charts-header">
              <div className="tm-charts-title-group">
                <h1 className="tm-charts-title">Market Intel & Benchmarks</h1>
                <p className="tm-charts-subtitle">
                  Live benchmark tracking and key market indicators.
                </p>
              </div>
              <button
                type="button"
                className="tm-btn-primary"
                onClick={() => setActiveTab('charts')}
              >
                Open Trading Charts
              </button>
            </div>

            <div className="tm-intel-grid">
              {[
                { name: 'Apple Inc.', symbol: 'NASDAQ:AAPL', change: '+1.12%', trend: 'Strong Momentum' },
                { name: 'Invesco QQQ', symbol: 'NASDAQ:QQQ', change: '+0.88%', trend: 'Bullish Expansion' },
                { name: 'USD / INR', symbol: 'FX:USDINR', change: '+0.05%', trend: 'Consolidation' },
                { name: 'Gold Spot', symbol: 'TVC:GOLD', change: '+0.32%', trend: 'Testing Highs' },
              ].map((item) => (
                <div key={item.symbol} className="tm-intel-card">
                  <div className="tm-intel-card-header">
                    <div>
                      <h3 className="tm-intel-name">{item.name}</h3>
                      <span className="tm-intel-symbol">{item.symbol}</span>
                    </div>
                    <span className="tm-intel-change positive">{item.change}</span>
                  </div>
                  <div className="tm-intel-card-footer">
                    <span className="tm-intel-trend">{item.trend}</span>
                    <button
                      type="button"
                      className="tm-btn-link"
                      onClick={() => {
                        handleSelectSymbol(item.symbol);
                        setActiveTab('charts');
                      }}
                    >
                      Open in Chart &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
