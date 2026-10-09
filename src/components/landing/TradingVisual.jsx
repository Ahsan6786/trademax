import React, { useState } from 'react';
import './TradingVisual.css';

export const TradingVisual = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1H');

  // Realistic OHLC Candlestick data points for a disciplined institutional breakout pattern
  // [x, open, high, low, close]
  const candles = [
    { x: 35,  o: 260, h: 250, l: 275, c: 270, bull: false },
    { x: 65,  o: 270, h: 245, l: 280, c: 252, bull: true },
    { x: 95,  o: 252, h: 238, l: 265, c: 260, bull: false },
    { x: 125, o: 260, h: 235, l: 272, c: 240, bull: true },
    { x: 155, o: 240, h: 228, l: 250, c: 232, bull: true },
    { x: 185, o: 232, h: 220, l: 248, c: 244, bull: false },
    { x: 215, o: 244, h: 230, l: 258, c: 235, bull: true },
    { x: 245, o: 235, h: 215, l: 245, c: 220, bull: true },
    { x: 275, o: 220, h: 205, l: 235, c: 210, bull: true },
    { x: 305, o: 210, h: 198, l: 225, c: 222, bull: false }, // Retest
    { x: 335, o: 222, h: 200, l: 228, c: 204, bull: true },
    { x: 365, o: 204, h: 185, l: 215, c: 190, bull: true },
    { x: 395, o: 190, h: 175, l: 200, c: 182, bull: true },
    { x: 425, o: 182, h: 170, l: 195, c: 188, bull: false }, // Small consolidation
    { x: 455, o: 188, h: 160, l: 196, c: 166, bull: true }, // Breakout candle
    { x: 485, o: 166, h: 145, l: 178, c: 150, bull: true },
    { x: 515, o: 150, h: 135, l: 162, c: 156, bull: false },
    { x: 545, o: 156, h: 122, l: 165, c: 130, bull: true },
    { x: 575, o: 130, h: 110, l: 142, c: 118, bull: true },
    { x: 605, o: 118, h: 96,  l: 125, c: 102, bull: true }, // Live candle
  ];

  const timeframes = ['15M', '1H', '4H', '1D'];

  return (
    <div className="tm-visual-wrapper anim-visual">
      {/* Outer Terminal Container */}
      <div className="tm-terminal-card">
        {/* Top Control Bar */}
        <div className="tm-terminal-header">
          <div className="tm-terminal-header-left">
            <div className="tm-terminal-symbol-group">
              <span className="tm-terminal-symbol">TMX / USD</span>
              <span className="tm-terminal-badge">SPOT • LIVE</span>
            </div>
            
            {/* Timeframe Selector */}
            <div className="tm-timeframe-selector" role="tablist" aria-label="Chart Timeframes">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`tm-tf-btn ${selectedTimeframe === tf ? 'active' : ''}`}
                  onClick={() => setSelectedTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="tm-terminal-header-right">
            <div className="tm-price-block">
              <span className="tm-price-value">2,842.60</span>
              <span className="tm-price-change">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="tm-arrow-icon" aria-hidden="true">
                  <path d="M5 1.5L8.5 5.5H1.5L5 1.5Z" fill="#059669" />
                </svg>
                +4.18%
              </span>
            </div>
            <div className="tm-feed-indicator" title="Live Market Stream">
              <span className="tm-feed-dot"></span>
              <span className="tm-feed-label">STREAMING</span>
            </div>
          </div>
        </div>

        {/* Main Chart Canvas Area */}
        <div className="tm-chart-canvas-container">
          {/* Subtle Watermark Logo Etched into Grid Canvas */}
          <div className="tm-chart-watermark">
            <img
              src="/tm-logo.png"
              alt=""
              aria-hidden="true"
              className="tm-watermark-img"
            />
          </div>

          {/* Precision SVG Chart */}
          <svg
            className="tm-chart-svg"
            viewBox="0 0 650 340"
            preserveAspectRatio="none"
            aria-label="TradingMax Real-Time Financial Terminal Chart"
          >
            <defs>
              {/* Soft Gradient Fill below institutional trendline */}
              <linearGradient id="tmTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#071A2B" stopOpacity="0.08" />
                <stop offset="60%" stopColor="#071A2B" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#071A2B" stopOpacity="0.00" />
              </linearGradient>

              {/* Candle Glow */}
              <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Horizontal Grid Lines */}
            <g className="tm-grid-lines">
              <line x1="20" y1="50" x2="620" y2="50" stroke="#EEF2F6" strokeDasharray="3 3" />
              <line x1="20" y1="110" x2="620" y2="110" stroke="#EEF2F6" strokeDasharray="3 3" />
              <line x1="20" y1="170" x2="620" y2="170" stroke="#EEF2F6" strokeDasharray="3 3" />
              <line x1="20" y1="230" x2="620" y2="230" stroke="#EEF2F6" strokeDasharray="3 3" />
              <line x1="20" y1="290" x2="620" y2="290" stroke="#EEF2F6" strokeDasharray="3 3" />
            </g>

            {/* Price Axis Labels */}
            <g className="tm-axis-labels">
              <text x="630" y="54" className="tm-axis-text">2,920.00</text>
              <text x="630" y="114" className="tm-axis-text">2,840.00</text>
              <text x="630" y="174" className="tm-axis-text">2,760.00</text>
              <text x="630" y="234" className="tm-axis-text">2,680.00</text>
              <text x="630" y="294" className="tm-axis-text">2,600.00</text>
            </g>

            {/* Institutional Technical Level: Resistance Breakout */}
            <g className="tm-technical-annotation">
              <line
                x1="280"
                y1="170"
                x2="615"
                y2="170"
                stroke="#667085"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <rect x="290" y="157" width="138" height="18" rx="3" fill="#FFFFFF" stroke="#E6EAF0" />
              <text x="296" y="170" className="tm-annotation-text">
                Breakout Level • 2,760.00
              </text>
            </g>

            {/* Trend Spline Area Fill */}
            <path
              d="M 35 270 
                 C 95 260, 155 240, 215 235 
                 C 275 210, 365 190, 425 185 
                 C 485 155, 545 130, 605 102 
                 L 605 320 
                 L 35 320 Z"
              fill="url(#tmTrendGradient)"
            />

            {/* Trend Spline Line (Deep Navy #071A2B) */}
            <path
              d="M 35 270 
                 C 95 260, 155 240, 215 235 
                 C 275 210, 365 190, 425 185 
                 C 485 155, 545 130, 605 102"
              fill="none"
              stroke="#071A2B"
              strokeWidth="2.25"
              strokeLinecap="round"
              className="tm-chart-line-anim"
            />

            {/* Candlesticks */}
            <g className="tm-candlesticks">
              {candles.map((c, i) => {
                const color = c.bull ? '#059669' : '#DC2626';
                const bodyY = Math.min(c.o, c.c);
                const bodyH = Math.max(Math.abs(c.o - c.c), 3);
                return (
                  <g key={i} className="tm-candle-item">
                    {/* Wick */}
                    <line
                      x1={c.x}
                      y1={c.h}
                      x2={c.x}
                      y2={c.l}
                      stroke={color}
                      strokeWidth="1.2"
                      opacity="0.85"
                    />
                    {/* Real Body */}
                    <rect
                      x={c.x - 4.5}
                      y={bodyY}
                      width="9"
                      height={bodyH}
                      rx="1"
                      fill={color}
                      stroke={color}
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}
            </g>

            {/* Live Crosshair & Anchor at the latest candle */}
            <g className="tm-live-cursor">
              {/* Vertical Crosshair Line */}
              <line
                x1="605"
                y1="40"
                x2="605"
                y2="300"
                stroke="#071A2B"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.3"
              />
              {/* Horizontal Crosshair Line */}
              <line
                x1="20"
                y1="102"
                x2="615"
                y2="102"
                stroke="#071A2B"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.3"
              />
              {/* Pulse rings */}
              <circle
                cx="605"
                cy="102"
                r="10"
                fill="none"
                stroke="#059669"
                strokeWidth="1.5"
                className="tm-cursor-pulse"
              />
              <circle
                cx="605"
                cy="102"
                r="3.5"
                fill="#059669"
              />
            </g>
          </svg>

          {/* Floating High-End Inspection Tag */}
          <div className="tm-floating-tag">
            <div className="tm-tag-status">
              <span className="tm-tag-dot"></span>
              <span className="tm-tag-title">INSTITUTIONAL EXPANSION</span>
            </div>
            <div className="tm-tag-metric">
              <span className="tm-tag-val">2,842.60</span>
              <span className="tm-tag-dir">BULLISH STRUCTURE</span>
            </div>
          </div>
        </div>

        {/* Terminal Bottom Telemetry Bar */}
        <div className="tm-terminal-footer">
          <div className="tm-telemetry-item">
            <span className="tm-telemetry-label">24H VOLUME</span>
            <span className="tm-telemetry-value">$1,428,950,000</span>
          </div>
          <div className="tm-telemetry-divider"></div>
          <div className="tm-telemetry-item">
            <span className="tm-telemetry-label">MARKET STRUCTURE</span>
            <span className="tm-telemetry-value text-green">ACCUMULATION BREAKOUT</span>
          </div>
          <div className="tm-telemetry-divider"></div>
          <div className="tm-telemetry-item">
            <span className="tm-telemetry-label">ALGO ENGINE</span>
            <span className="tm-telemetry-value">99.98% OPTIMAL</span>
          </div>
        </div>
      </div>
    </div>
  );
};
