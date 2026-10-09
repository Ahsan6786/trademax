import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget({ symbol = 'NASDAQ:AAPL' }) {
  const containerRef = useRef(null);

  const cleanSymbolName = symbol.includes(':') ? symbol.split(':')[1] : symbol;
  const tvSymbolUrl = `https://www.tradingview.com/symbols/${symbol.replace(':', '-')}/`;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;
    let scriptEl = null;

    // Use a small frame delay to ensure styles and layouts have settled,
    // avoiding forced synchronous reflow / FOUC warnings during initial page render,
    // and preventing duplicate in-flight script execution in React StrictMode.
    const timer = setTimeout(() => {
      if (!isMounted || !container) return;

      // Clean existing contents and rebuild fresh widget slot
      container.innerHTML = `
        <div class="tradingview-widget-container__widget" style="height: calc(100% - 32px); width: 100%;"></div>
        <div class="tradingview-widget-copyright">
          <a href="${tvSymbolUrl}" rel="noopener nofollow" target="_blank">
            <span class="blue-text">${cleanSymbolName} chart</span>
          </a>
          <span class="trademark">&nbsp;by TradingView</span>
        </div>
      `;

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        allow_symbol_change: true,
        calendar: false,
        details: false,
        hide_side_toolbar: true,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_volume: false,
        hotlist: false,
        interval: 'D',
        locale: 'en',
        save_image: true,
        style: '0',
        symbol: symbol,
        theme: 'dark',
        timezone: 'Asia/Kolkata',
        backgroundColor: 'rgba(15, 15, 15, 1)',
        gridColor: 'rgba(255, 255, 255, 0.2)',
        watchlist: [],
        withdateranges: false,
        compareSymbols: [],
        support_host: 'https://www.tradingview.com',
        studies: [],
        autosize: true,
      });

      scriptEl = script;
      container.appendChild(script);
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);

      // In-flight safety net for TradingView external script:
      // If a script tag was inserted and is still loading while unmounting,
      // detaching it completely makes its parentNode null. When TradingView's
      // internal `_replaceScript` executes, it calls `h.querySelector` on parentNode `h`,
      // throwing "TypeError: can't access property querySelector, h is null".
      // By preserving an off-screen container with the expected widget structure,
      // any pending execution resolves safely without polluting the console.
      if (scriptEl && scriptEl.parentNode) {
        const dummy = document.createElement('div');
        dummy.className = 'tradingview-widget-container';
        const dummyWidget = document.createElement('div');
        dummyWidget.className = 'tradingview-widget-container__widget';
        const dummyCopyright = document.createElement('div');
        dummyCopyright.className = 'tradingview-widget-copyright';
        dummy.appendChild(dummyWidget);
        dummy.appendChild(dummyCopyright);
        dummy.appendChild(scriptEl);
      }

      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, cleanSymbolName, tvSymbolUrl]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: '100%', width: '100%' }}
    />
  );
}

export default memo(TradingViewWidget);
