import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // Background scroll lock & Escape key handling when mobile menu is active
  useEffect(() => {
    if (mobileMenuOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [mobileMenuOpen]);

  const handleAuthClick = (e, mode) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (onOpenAuth) {
      onOpenAuth(e.currentTarget, mode);
    }
  };

  const handleNavClick = (e, target) => {
    if (e && e.preventDefault) e.preventDefault();
    setMobileMenuOpen(false);

    if (target === 'contact') {
      if (onNavigate) {
        onNavigate('landing');
        setTimeout(() => {
          const el =
            document.getElementById('contact') ||
            document.querySelector('.tm-site-footer') ||
            document.querySelector('.tm-footer-mobile-wrapper');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      } else {
        const el =
          document.getElementById('contact') ||
          document.querySelector('.tm-site-footer') ||
          document.querySelector('.tm-footer-mobile-wrapper');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

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
          DESKTOP NAVIGATION (min-width: 769px) - 100% UNCHANGED
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

        {/* Right CTA & Controls (Desktop) */}
        <div className="tm-navbar-actions">
          {/* Theme Toggle */}
          {onToggleTheme && (
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          )}

          {/* Social Media: Instagram Direct Link */}
          <a
            href="https://www.instagram.com/patiltrader"
            target="_blank"
            rel="noopener noreferrer"
            className="tm-nav-social-btn"
            aria-label="Patil Trader Instagram"
            title="Follow on Instagram @patiltrader"
          >
            <svg
              width="18"
              height="18"
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
            <div className="tm-nav-user-badge">
              <span className="tm-nav-user-dot" />
              <span>{user.name || 'Student'}</span>
              <button
                type="button"
                className="tm-nav-btn-logout"
                onClick={onLogout}
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
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
                <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------
          MOBILE HEADER (max-width: 768px)
          ------------------------------------------------------------------ */}
      <div className="tm-navbar-mobile-container">
        {isHome ? (
          /* HOME PAGE MOBILE HEADER */
          <div className="tm-mobile-home-header">
            <a
              href="/"
              className="tm-mobile-brand"
              onClick={(e) => {
                if (onNavigate) {
                  e.preventDefault();
                  onNavigate('landing');
                }
              }}
              aria-label="TradeMax Home"
            >
              <img
                src="/tm-logo.png"
                alt="TradeMax"
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
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
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
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------
          FULL-SCREEN MOBILE NAVIGATION SIDEBAR (Portal to document.body)
          Agency-inspired editorial overlay:
          - Background: #F8F7F2 (warm off-white)
          - Typography: #111111 (black)
          - Accent: #E52429 (TRADEMAX red)
          - Full Height 01-06 Navigation + LET'S TALK CTA
          ------------------------------------------------------------------ */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`tm-mobile-fs-overlay ${mobileMenuOpen ? 'open' : ''}`}
            aria-hidden={!mobileMenuOpen}
            role="dialog"
            aria-label="Mobile Navigation"
          >
            <div className="tm-fs-inner">
              {/* Top Bar: Logo (left) + Large Minimal X (right, >= 44x44 touch target) */}
              <div className="tm-fs-topbar">
                <a
                  href="/"
                  className="tm-fs-brand"
                  onClick={(e) => handleNavClick(e, 'landing')}
                  aria-label="TRADEMAX Home"
                >
                  <img
                    src="/tm-logo.png"
                    alt="TradeMax Logo"
                    className="tm-fs-logo-img"
                  />
                  <span className="tm-fs-brand-name">
                    TRADE<span className="tm-fs-brand-red">MAX</span>
                  </span>
                </a>

                <button
                  type="button"
                  className="tm-fs-close-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close Navigation"
                >
                  <X size={26} strokeWidth={2.2} />
                </button>
              </div>

              {/* Full Height Numbered Navigation: 01 to 06 */}
              <nav className="tm-fs-nav" aria-label="Mobile Navigation Links">
                <a
                  href="#home"
                  className={`tm-fs-nav-link ${currentView === 'landing' ? 'active' : ''}`}
                  onClick={(e) => handleNavClick(e, 'landing')}
                >
                  <span className="tm-fs-num">01</span>
                  <span className="tm-fs-label">HOME</span>
                </a>

                <a
                  href="#courses"
                  className={`tm-fs-nav-link ${currentView === 'course-details' ? 'active' : ''}`}
                  onClick={(e) => handleNavClick(e, 'courses')}
                >
                  <span className="tm-fs-num">02</span>
                  <span className="tm-fs-label">COURSES</span>
                </a>

                <a
                  href="/founder"
                  className={`tm-fs-nav-link ${currentView === 'founder' ? 'active' : ''}`}
                  onClick={(e) => handleNavClick(e, 'founder')}
                >
                  <span className="tm-fs-num">03</span>
                  <span className="tm-fs-label">FOUNDER</span>
                </a>

                <a
                  href="/gallery"
                  className={`tm-fs-nav-link ${currentView === 'gallery' ? 'active' : ''}`}
                  onClick={(e) => handleNavClick(e, 'gallery')}
                >
                  <span className="tm-fs-num">04</span>
                  <span className="tm-fs-label">GALLERY</span>
                </a>

                <a
                  href="#terminal"
                  className="tm-fs-nav-link"
                  onClick={(e) => handleNavClick(e, 'dashboard')}
                >
                  <span className="tm-fs-num">05</span>
                  <span className="tm-fs-label">TRADING TERMINAL</span>
                </a>

                <a
                  href="#contact"
                  className="tm-fs-nav-link"
                  onClick={(e) => handleNavClick(e, 'contact')}
                >
                  <span className="tm-fs-num">06</span>
                  <span className="tm-fs-label">CONTACT</span>
                </a>
              </nav>

              {/* Prominent Full-Width Contact CTA Button */}
              <a
                href="#contact"
                className="tm-fs-cta-btn"
                onClick={(e) => handleNavClick(e, 'contact')}
                aria-label="Direct Consultation: Let's Talk"
              >
                <span className="tm-fs-cta-text">LET'S TALK</span>
                <span className="tm-fs-cta-arrow" aria-hidden="true">&rarr;</span>
              </a>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};

export default Navbar;
