import React, { useEffect, useRef, memo } from 'react';
import './TradingViewWidget.css';

function TradingViewWidget({ symbol = 'BINANCE:BTCUSDT', theme = 'dark' }) {
  const containerRef = useRef(null);
  const isLight = theme === 'light';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;
    let scriptEl = null;

    // Small frame delay to ensure styles and container dimensions are calculated
    const timer = setTimeout(() => {
      if (!isMounted || !container) return;

      container.innerHTML = `
        <div class="tradingview-widget-container__widget" style="height: 100%; width: 100%;"></div>
      `;

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        width: '100%',
        height: '100%',
        symbol: symbol,
        interval: 'D',
        timezone: 'Asia/Kolkata',
        theme: isLight ? 'light' : 'dark',
        style: '1', // Candlestick chart
        locale: 'en',
        enable_publishing: false,
        allow_symbol_change: true,
        calendar: false,
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_volume: false,
        hotlist: false,
        save_image: true,
        backgroundColor: isLight ? '#FFFFFF' : 'rgba(11, 12, 14, 1)',
        gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
        watchlist: [],
        withdateranges: true,
        compareSymbols: [],
        support_host: 'https://www.tradingview.com',
        studies: [],
        autosize: true,
      });

      scriptEl = script;
      container.appendChild(script);
    }, 10);

    return () => {
      isMounted = false;
      clearTimeout(timer);

      // In-flight safety net for TradingView external script
      if (scriptEl && scriptEl.parentNode) {
        const dummy = document.createElement('div');
        dummy.className = 'tradingview-widget-container';
        const dummyWidget = document.createElement('div');
        dummyWidget.className = 'tradingview-widget-container__widget';
        dummy.appendChild(dummyWidget);
        dummy.appendChild(scriptEl);
      }

      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, theme, isLight]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: '100%', width: '100%' }}
    />
  );
}

export default memo(TradingViewWidget);
