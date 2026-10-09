import React, { useState } from 'react';
import './Navbar.css';

export const Navbar = ({ onOpenAuth, onNavigate, user, onLogout }) => {
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

  return (
    <header className="tm-navbar-header anim-nav">
      <div className="tm-navbar-container">
        {/* Brand Logo */}
        <a href="/" className="tm-navbar-brand" aria-label="TradeMax Home">
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
          <a href="#home" className="tm-nav-link active">Home</a>
          <a href="#courses" className="tm-nav-link">Courses</a>
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
          {/* Instagram Link */}
          <a
            href="https://www.instagram.com/trademax.mitwpu/"
            target="_blank"
            rel="noopener noreferrer"
            className="tm-nav-social-btn"
            aria-label="Follow TradeMax on Instagram"
            title="Follow on Instagram"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>

          {user ? (
            <>
              <button
                type="button"
                className="tm-nav-btn-dashboard"
                onClick={() => onNavigate && onNavigate('dashboard')}
              >
                <span className="tm-nav-user-dot" aria-hidden="true"></span>
                <span>Student Terminal</span>
              </button>
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

          {/* Mobile Menu Toggle Button (Mobile only) */}
          <button
            type="button"
            className="tm-mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <span className={`tm-hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`tm-hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Backdrop & Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="tm-mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="tm-mobile-nav-panel">
            <nav className="tm-mobile-nav-links">
              <a
                href="#home"
                onClick={() => setMobileMenuOpen(false)}
                className="tm-mobile-link active"
              >
                <span>Home</span>
                <span className="tm-mobile-link-dot" aria-hidden="true"></span>
              </a>
              <a
                href="#courses"
                onClick={() => setMobileMenuOpen(false)}
                className="tm-mobile-link"
              >
                <span>Courses</span>
                <span className="tm-mobile-badge-pill">Curriculum</span>
              </a>
              <a
                href="#terminal"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleNavClick(e, 'terminal');
                }}
                className="tm-mobile-link"
              >
                <span>Trading Terminal</span>
                <span className="tm-mobile-badge-pill tm-badge-live">Live</span>
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="tm-mobile-link"
              >
                <span>About</span>
              </a>
            </nav>

            <div className="tm-mobile-nav-actions">
              {user ? (
                <>
                  <button
                    type="button"
                    className="tm-mobile-btn-dashboard"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onNavigate) onNavigate('dashboard');
                    }}
                  >
                    Student Dashboard
                  </button>
                  <button
                    type="button"
                    className="tm-mobile-btn-logout"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="tm-mobile-btn-login"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleAuthClick(e, 'login');
                    }}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className="tm-mobile-btn-primary"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleAuthClick(e, 'register');
                    }}
                  >
                    Get Started &rarr;
                  </button>
                </>
              )}
            </div>

            <div className="tm-mobile-nav-footer">
              <a
                href="https://www.instagram.com/trademax.mitwpu/"
                target="_blank"
                rel="noopener noreferrer"
                className="tm-mobile-instagram-link"
                aria-label="Follow TradeMax on Instagram"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>Instagram</span>
              </a>
              <span className="tm-mobile-status-dot" aria-hidden="true"></span>
              <span>LIVE PLATFORM</span>
            </div>
          </div>
        </>
      )}
    </header>
  );
};
