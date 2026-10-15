import React from 'react';
import { ShieldCheck } from 'lucide-react';
import './Footer.css';

export const Footer = ({ onNavigate, theme = 'dark' }) => {
  const currentYear = new Date().getFullYear();

  const handleNav = (e, target) => {
    e.preventDefault();
    if (target === 'course-details') {
      if (onNavigate) onNavigate('course-details');
    } else if (target === 'courses') {
      if (onNavigate) {
        onNavigate('courses');
      } else {
        const el = document.getElementById('courses');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (target === 'founder') {
      if (onNavigate) onNavigate('founder');
    } else if (target === 'gallery') {
      if (onNavigate) onNavigate('gallery');
    } else if (target === 'home') {
      if (onNavigate) onNavigate('landing');
    }
  };

  return (
    <footer className={`tm-site-footer tm-footer-${theme}`} aria-label="TradeMax Footer">
      <div className="tm-footer-container">
        {/* Top Grid: Brand & Navigation Columns */}
        <div className="tm-footer-grid">
          {/* Column 1: Brand & Social Channels */}
          <div className="tm-footer-col tm-footer-brand-col">
            <div className="tm-footer-logo-row">
              <img
                src="/tm-logo.png"
                alt="TradeMax Logo"
                className="tm-footer-logo-img"
              />
              <span className="tm-footer-brand-title">
                TRADE<span className="tm-footer-red">MAX</span>
                <span className="tm-footer-byline">by Patil Trader</span>
              </span>
            </div>

            <p className="tm-footer-about-text">
              Empowering disciplined traders with institutional order flow, technical market structure, and systematic risk management frameworks.
            </p>

            {/* Social Media Channels */}
            <div className="tm-footer-socials" aria-label="Official Social Channels">
              <a
                href="https://www.youtube.com/@PatilTrader"
                target="_blank"
                rel="noopener noreferrer"
                className="tm-social-icon-btn"
                aria-label="YouTube Channel"
                title="TradeMax on YouTube"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://t.me/patiltrader"
                target="_blank"
                rel="noopener noreferrer"
                className="tm-social-icon-btn"
                aria-label="Telegram Community"
                title="TradeMax on Telegram"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/patiltrader"
                target="_blank"
                rel="noopener noreferrer"
                className="tm-social-icon-btn"
                aria-label="Instagram Profile"
                title="TradeMax on Instagram"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a
                href="https://twitter.com/patiltrader"
                target="_blank"
                rel="noopener noreferrer"
                className="tm-social-icon-btn"
                aria-label="Twitter / X"
                title="TradeMax on X"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Trading Programs */}
          <div className="tm-footer-col">
            <h4 className="tm-footer-col-title">Programs</h4>
            <ul className="tm-footer-list">
              <li>
                <a
                  href="/courses/trading-masterclass"
                  onClick={(e) => handleNav(e, 'course-details')}
                  className="tm-footer-item-link"
                >
                  Institutional Masterclass
                </a>
              </li>
              <li>
                <a
                  href="#courses"
                  onClick={(e) => handleNav(e, 'courses')}
                  className="tm-footer-item-link"
                >
                  Forex &amp; Crypto Curriculum
                </a>
              </li>
              <li>
                <a
                  href="#courses"
                  onClick={(e) => handleNav(e, 'courses')}
                  className="tm-footer-item-link"
                >
                  Batch Admissions
                </a>
              </li>
              <li>
                <a
                  href="#courses"
                  onClick={(e) => handleNav(e, 'courses')}
                  className="tm-footer-item-link"
                >
                  Order Flow Strategies
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform Tools */}
          <div className="tm-footer-col">
            <h4 className="tm-footer-col-title">Platform</h4>
            <ul className="tm-footer-list">
              <li>
                <a
                  href="/founder"
                  onClick={(e) => handleNav(e, 'founder')}
                  className="tm-footer-item-link"
                >
                  Founder &amp; Vision
                </a>
              </li>
              <li>
                <a
                  href="/gallery"
                  onClick={(e) => handleNav(e, 'gallery')}
                  className="tm-footer-item-link"
                >
                  Photo Gallery
                </a>
              </li>
              <li>
                <a
                  href="#home"
                  onClick={(e) => handleNav(e, 'home')}
                  className="tm-footer-item-link"
                >
                  Trading Terminal
                </a>
              </li>
              <li>
                <a
                  href="#home"
                  onClick={(e) => handleNav(e, 'home')}
                  className="tm-footer-item-link"
                >
                  Supercharged Supercharts
                </a>
              </li>
              <li>
                <a
                  href="#home"
                  onClick={(e) => handleNav(e, 'home')}
                  className="tm-footer-item-link"
                >
                  Live Market Structure
                </a>
              </li>
              <li>
                <a
                  href="#home"
                  onClick={(e) => handleNav(e, 'home')}
                  className="tm-footer-item-link"
                >
                  Risk Management Matrix
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Governance & Transparency */}
          <div className="tm-footer-col">
            <h4 className="tm-footer-col-title">Transparency</h4>
            <ul className="tm-footer-list">
              <li>
                <a href="#privacy" onClick={(e) => e.preventDefault()} className="tm-footer-item-link">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" onClick={(e) => e.preventDefault()} className="tm-footer-item-link">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#risk" onClick={(e) => e.preventDefault()} className="tm-footer-item-link">
                  Risk Disclosure
                </a>
              </li>
              <li>
                <a href="#refund" onClick={(e) => e.preventDefault()} className="tm-footer-item-link">
                  Admission Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Separator */}
        <div className="tm-footer-divider" />

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="tm-footer-bottom-row">
          <div className="tm-footer-copy">
            &copy; {currentYear} TRADEMAX by Patil Trader. All rights reserved.
          </div>
          <div className="tm-footer-security-badge">
            <ShieldCheck size={14} className="tm-footer-shield" />
            <span>Structured Financial Discipline &amp; Verified Curriculum</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
