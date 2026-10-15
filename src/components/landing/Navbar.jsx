import React, { useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
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
  currentView = 'landing',
  onBack,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAuthClick = (e, mode) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (onOpenAuth) {
      onOpenAuth(e.currentTarget, mode);
    }
  };

  const handleNavClick = (e, target) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(target);
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
          DESKTOP NAVIGATION (min-width: 769px)
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
            className={`tm-nav-link ${currentView === 'landing' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'landing')}
          >
            Home
          </a>
          <a
            href="#courses"
            className={`tm-nav-link ${currentView === 'course-details' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'courses')}
          >
            Courses
          </a>
          <a
            href="/founder"
            className={`tm-nav-link ${currentView === 'founder' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'founder')}
          >
            Founder
          </a>
          <a
            href="/gallery"
            className={`tm-nav-link ${currentView === 'gallery' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'gallery')}
          >
            Gallery
          </a>
          <a
            href="#terminal"
            className="tm-nav-link"
            onClick={(e) => handleNavClick(e, 'dashboard')}
          >
            Trading Terminal
          </a>
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
          MOBILE NAVIGATION HEADER (max-width: 768px)
          ------------------------------------------------------------------ */}
      <div className="tm-navbar-mobile-container">
        {isHome ? (
          /* HOME PAGE MOBILE HEADER */
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

            <div className="tm-mobile-home-actions">
              {onToggleTheme && (
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              )}
              <button
                type="button"
                className="tm-mobile-menu-toggle-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        ) : (
          /* INTERNAL PAGES MOBILE HEADER */
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

            <div className="tm-mobile-home-actions">
              {onToggleTheme && (
                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
              )}
              <button
                type="button"
                className="tm-mobile-menu-toggle-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------
          MOBILE SLIDE-OUT DRAWER MENU
          ------------------------------------------------------------------ */}
      {mobileMenuOpen && (
        <div
          className="tm-mobile-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`tm-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="tm-mobile-drawer-header">
          <div className="tm-drawer-brand">
            <img src="/tm-logo.png" alt="TRADEMAX" className="tm-drawer-logo" />
            <span className="tm-drawer-brand-name">
              TRADE<span className="tm-brand-red">MAX</span>
            </span>
          </div>
          <button
            type="button"
            className="tm-drawer-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Navigation"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="tm-mobile-drawer-nav" aria-label="Mobile Navigation Links">
          <a
            href="#home"
            className={`tm-drawer-link ${currentView === 'landing' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'landing')}
          >
            <span>Home</span>
          </a>
          <a
            href="#courses"
            className={`tm-drawer-link ${currentView === 'course-details' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'courses')}
          >
            <span>Courses</span>
          </a>
          <a
            href="/founder"
            className={`tm-drawer-link ${currentView === 'founder' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'founder')}
          >
            <span>Founder</span>
            <span className="tm-drawer-badge">Vision</span>
          </a>
          <a
            href="/gallery"
            className={`tm-drawer-link ${currentView === 'gallery' ? 'active' : ''}`}
            onClick={(e) => handleNavClick(e, 'gallery')}
          >
            <span>Gallery</span>
            <span className="tm-drawer-badge">Photos</span>
          </a>
          <a
            href="#terminal"
            className="tm-drawer-link"
            onClick={(e) => handleNavClick(e, 'dashboard')}
          >
            <span>Trading Terminal</span>
          </a>
        </nav>

        <div className="tm-mobile-drawer-footer">
          {user ? (
            <div className="tm-drawer-user-box">
              <div className="tm-drawer-user-info">
                <span className="tm-drawer-user-dot" />
                <span className="tm-drawer-user-name">{user.name || 'Account'}</span>
              </div>
              <button
                type="button"
                className="tm-drawer-logout-btn"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onLogout) onLogout();
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="tm-drawer-auth-actions">
              <button
                type="button"
                className="tm-drawer-btn-login"
                onClick={(e) => handleAuthClick(e, 'login')}
              >
                Login
              </button>
              <button
                type="button"
                className="tm-drawer-btn-primary"
                onClick={(e) => handleAuthClick(e, 'register')}
              >
                <span>Get Started</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
