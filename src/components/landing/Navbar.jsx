import React, { useState } from 'react';
import { ThemeToggle } from '../common/ThemeToggle';
import './Navbar.css';

export const Navbar = ({
  onOpenAuth,
  onNavigate,
  user,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  isHome = true,
  onBack,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAuthClick = (e, mode) => {
    e.preventDefault();
    if (onOpenAuth) {
      onOpenAuth(e.currentTarget, mode);
    }
  };

  const handleNavClick = (e, target) => {
    if (target === 'terminal' || target === 'dashboard') {
      e.preventDefault();
      if (onNavigate) {
        onNavigate('dashboard');
      }
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (onNavigate) {
      onNavigate('landing');
    } else {
      window.location.href = '/';
    }
  };

  return (
    <header className={`tm-navbar-header anim-nav ${theme === 'dark' ? 'tm-navbar-dark' : 'tm-navbar-light'}`}>
      {/* ------------------------------------------------------------------
          DESKTOP NAVIGATION (min-width: 769px) - Preserved completely
          ------------------------------------------------------------------ */}
      <div className="tm-navbar-desktop-container">
        {/* Brand Logo */}
        <a
          href="/"
          className="tm-navbar-brand"
          aria-label="TradeMax Home"
          onClick={(e) => {
            if (onNavigate) {
              e.preventDefault();
              onNavigate('landing');
            }
          }}
        >
          <img
            src="/tm-logo.png"
            alt="TradeMax"
            className="tm-navbar-logo-img"
          />
          <span className="tm-navbar-brand-name">
            Trade<span className="tm-brand-red">Max</span>
          </span>
        </a>

        {/* Center / Primary Navigation (Desktop) */}
        <nav className="tm-navbar-nav" aria-label="Main Navigation">
          <a
            href="#home"
            className="tm-nav-link active"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('landing');
              }
            }}
          >
            Home
          </a>
          <a
            href="#courses"
            className="tm-nav-link"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) {
                onNavigate('courses');
              } else {
                const el = document.getElementById('courses');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            Courses
          </a>
          <a
            href="#terminal"
            className="tm-nav-link"
            onClick={(e) => handleNavClick(e, 'terminal')}
          >
            Trading Terminal
          </a>
          <a href="#about" className="tm-nav-link">About</a>
        </nav>

        {/* Right CTA Actions */}
        <div className="tm-navbar-actions">
          {/* Day / Night Mode Toggle (Desktop) */}
          {onToggleTheme && (
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          )}

          {user ? (
            <>
              <div className="tm-nav-user-badge">
                <span className="tm-nav-user-dot" aria-hidden="true"></span>
                <span className="tm-nav-user-name">{user.name || 'Account'}</span>
              </div>
              <button
                type="button"
                className="tm-nav-btn-logout"
                onClick={onLogout}
                title="Sign out"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="tm-nav-btn-login"
                onClick={(e) => handleAuthClick(e, 'login')}
              >
                Login
              </button>
              <button
                type="button"
                className="tm-nav-btn-primary"
                onClick={(e) => handleAuthClick(e, 'register')}
              >
                <span>Get Started</span>
                <span className="tm-nav-btn-arrow" aria-hidden="true">&rarr;</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------
          MOBILE NAVIGATION (max-width: 768px)
          ------------------------------------------------------------------ */}
      <div className="tm-navbar-mobile-container">
        {isHome ? (
          /* HOME PAGE MOBILE HEADER: Logo (Left) + Day/Night Toggle (Right) */
          <div className="tm-mobile-home-header">
            <a
              href="/"
              className="tm-mobile-brand"
              aria-label="TRADEMAX Home"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('landing');
                }
              }}
            >
              <img
                src="/tm-logo.png"
                alt="TRADEMAX"
                className="tm-mobile-logo-img"
              />
              <span className="tm-mobile-brand-name">
                TRADE<span className="tm-brand-red">MAX</span>
              </span>
            </a>

            {onToggleTheme && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            )}
          </div>
        ) : (
          /* ALL OTHER PAGES MOBILE HEADER: Back button (Left) + Day/Night Toggle (Right) */
          <div className="tm-mobile-internal-header">
            <button
              type="button"
              className="tm-mobile-back-btn"
              onClick={handleBack}
              aria-label="Go back to previous page"
            >
              <span className="tm-mobile-back-arrow" aria-hidden="true">&larr;</span>
              <span className="tm-mobile-back-text">Back</span>
            </button>

            {onToggleTheme && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
