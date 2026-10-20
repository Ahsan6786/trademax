/* ==========================================================================
   TRADEMAX — System UI (status bar) + mobile viewport helpers
   Single source of truth for <meta name="theme-color"> and the iOS status
   bar style, plus keyboard / standalone-zoom handling.
   ========================================================================== */

export function getTopBarColor(view, theme, authOpen = false) {
  if (authOpen) return '#000000'; // Auth overlay is always pure black
  // TradeMax student dashboard and admin panel use the signature red topbar
  if (view === 'dashboard' || view === 'admin') {
    return '#DC2626';
  }
  const dark = theme === 'dark';
  return dark ? '#000000' : '#FFFFFF';
}

function isLight(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}

export function applySystemUI(color) {
  if (typeof document === 'undefined') return;
  const meta = document.getElementById('theme-color-meta');
  if (meta) {
    meta.setAttribute('content', color);
    const next = meta.cloneNode(true);
    next.setAttribute('content', color);
    meta.replaceWith(next);
  } else {
    const next = document.createElement('meta');
    next.name = 'theme-color';
    next.id = 'theme-color-meta';
    next.content = color;
    document.head.appendChild(next);
  }
  // Paint the root with the top colour's counterpart so overscroll / gaps never flash
  document.documentElement.style.setProperty('--tm-system-ui-color', color);

  // iOS: black-translucent = full-bleed page under a white-text bar (dark pages);
  // default = dark text (light pages).
  const apple = document.getElementById('apple-status-bar-meta');
  if (apple) {
    apple.setAttribute('content', isLight(color) ? 'default' : 'black-translucent');
  }
}

export function initMobileViewport() {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) root.classList.add('tm-standalone');

  // Keyboard-aware viewport height (iOS Safari + Android Chrome)
  const vv = window.visualViewport;
  const update = () => {
    const h = vv ? vv.height : window.innerHeight;
    root.style.setProperty('--tm-vvh', `${Math.round(h)}px`);
    const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    root.style.setProperty('--tm-kb-inset', `${Math.round(kb)}px`);
  };
  update();
  if (vv) {
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
  }
  window.addEventListener('orientationchange', update);

  // Installed app only: block iOS pinch-zoom of the whole UI (browser tabs keep zoom
  // for accessibility). Charts handle their own gestures and are unaffected.
  if (standalone) {
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((evt) =>
      document.addEventListener(evt, (e) => e.preventDefault(), { passive: false }),
    );
  }
}
