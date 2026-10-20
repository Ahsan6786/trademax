import React from 'react';
import './Footer.css';

export const Footer = ({ onNavigate }) => {
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
    } else if (target === 'home') {
      if (onNavigate) onNavigate('landing');
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === 'dashboard') {
      if (onNavigate) onNavigate('dashboard');
      else {
        const el = document.getElementById('terminal');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (target === 'privacy') {
      if (onNavigate) onNavigate('privacy');
      else window.location.hash = '#privacy';
    } else if (target === 'terms') {
      if (onNavigate) onNavigate('terms');
      else window.location.hash = '#terms';
    } else if (target === 'refund') {
      if (onNavigate) onNavigate('refund');
      else window.location.hash = '#refund';
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="tm-site-footer" id="contact" aria-label="TRADEMAX Footer">
      {/* Subtle trading candlestick graphics behind the gradient */}
      <div className="tm-footer-candlesticks-bg" aria-hidden="true">
        <svg viewBox="0 0 1200 700" preserveAspectRatio="none" className="tm-candlesticks-svg">
          <g stroke="#000000" strokeWidth="1.8" fill="#000000" opacity="0.07">
            {/* Candlestick 1 */}
            <line x1="60" y1="20" x2="60" y2="200" />
            <rect x="53" y="60" width="14" height="95" rx="1.5" />

            {/* Candlestick 2 */}
            <line x1="140" y1="50" x2="140" y2="270" />
            <rect x="133" y="90" width="14" height="130" rx="1.5" />

            {/* Candlestick 3 */}
            <line x1="220" y1="30" x2="220" y2="230" />
            <rect x="213" y="70" width="14" height="105" rx="1.5" />

            {/* Candlestick 4 */}
            <line x1="300" y1="90" x2="300" y2="340" />
            <rect x="293" y="140" width="14" height="135" rx="1.5" />

            {/* Candlestick 5 */}
            <line x1="380" y1="50" x2="380" y2="260" />
            <rect x="373" y="100" width="14" height="110" rx="1.5" />

            {/* Candlestick 6 */}
            <line x1="460" y1="110" x2="460" y2="390" />
            <rect x="453" y="170" width="14" height="150" rx="1.5" />

            {/* Candlestick 7 */}
            <line x1="540" y1="70" x2="540" y2="320" />
            <rect x="533" y="125" width="14" height="125" rx="1.5" />

            {/* Candlestick 8 */}
            <line x1="620" y1="130" x2="620" y2="440" />
            <rect x="613" y="200" width="14" height="160" rx="1.5" />

            {/* Candlestick 9 */}
            <line x1="700" y1="90" x2="700" y2="380" />
            <rect x="693" y="155" width="14" height="140" rx="1.5" />

            {/* Candlestick 10 */}
            <line x1="780" y1="150" x2="780" y2="480" />
            <rect x="773" y="225" width="14" height="170" rx="1.5" />

            {/* Candlestick 11 */}
            <line x1="860" y1="100" x2="860" y2="410" />
            <rect x="853" y="165" width="14" height="145" rx="1.5" />

            {/* Candlestick 12 */}
            <line x1="940" y1="170" x2="940" y2="520" />
            <rect x="933" y="250" width="14" height="175" rx="1.5" />

            {/* Candlestick 13 */}
            <line x1="1020" y1="120" x2="1020" y2="450" />
            <rect x="1013" y="190" width="14" height="150" rx="1.5" />

            {/* Candlestick 14 */}
            <line x1="1100" y1="190" x2="1100" y2="560" />
            <rect x="1093" y="275" width="14" height="170" rx="1.5" />

            {/* Candlestick 15 */}
            <line x1="1160" y1="140" x2="1160" y2="470" />
            <rect x="1153" y="210" width="14" height="145" rx="1.5" />
          </g>
        </svg>
      </div>

      <div className="tm-footer-inner-container">
        {/* Upper Section: Navigation Links */}
        <div className="tm-footer-upper-section">
          <nav className="tm-footer-nav" aria-label="Footer Navigation Links">
            <a href="#home" onClick={(e) => handleNav(e, 'home')} className="tm-footer-nav-link">
              <span>Home</span>
              <span className="tm-footer-link-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF1E27" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </span>
            </a>
            <a href="#courses" onClick={(e) => handleNav(e, 'courses')} className="tm-footer-nav-link">
              <span>Courses</span>
              <span className="tm-footer-link-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF1E27" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </span>
            </a>
            <a href="#terminal" onClick={(e) => handleNav(e, 'dashboard')} className="tm-footer-nav-link">
              <span>Trading Terminal</span>
              <span className="tm-footer-link-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF1E27" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </span>
            </a>
            <a href="tel:+916352461137" className="tm-footer-nav-link" title="Call TradeMax Admissions">
              <span>Contact (6352461137)</span>
              <span className="tm-footer-link-arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF1E27" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </span>
            </a>
          </nav>
        </div>

        {/* Lower Section: Oversized Wordmark, Divider, Bottom Row */}
        <div className="tm-footer-lower-section">
          {/* Oversized TRADEMAX Wordmark with trending red arrow */}
          <div className="tm-footer-oversized-wordmark" aria-label="TRADEMAX">
            <span className="tm-oversized-trade">TRADE</span>
            <span className="tm-oversized-max">MAX</span>
            <span className="tm-oversized-arrow" aria-hidden="true">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#FF1E27" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="tm-wordmark-svg">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </span>
          </div>

          {/* Institutional Policy Links & Official Contact/Social Badges */}
          <div className="tm-footer-institutional-row">
            <div className="tm-footer-policy-links">
              <a
                href="#privacy"
                onClick={(e) => handleNav(e, 'privacy')}
                className="tm-footer-policy-link"
              >
                Privacy Policy
              </a>
              <span className="tm-footer-policy-dot" aria-hidden="true">•</span>
              <a
                href="#terms"
                onClick={(e) => handleNav(e, 'terms')}
                className="tm-footer-policy-link"
              >
                Terms &amp; Conditions
              </a>
              <span className="tm-footer-policy-dot" aria-hidden="true">•</span>
              <a
                href="#refund"
                onClick={(e) => handleNav(e, 'refund')}
                className="tm-footer-policy-link"
              >
                Refund Policy
              </a>
            </div>

            <div className="tm-footer-social-links">
              {/* Official Telegram Channel */}
              <a
                href="https://t.me/trademaxchallenge"
                target="_blank"
                rel="noopener noreferrer"
                className="tm-footer-social-link tm-footer-telegram-link"
                aria-label="Join TradeMax on Telegram @trademaxchallenge"
                title="Official TradeMax Telegram @trademaxchallenge"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                <span>Telegram</span>
              </a>

              {/* Official Instagram */}
              <a
                href="https://www.instagram.com/patil_trader01?cplk=MTUwcXZjMnplNnJ5Nw%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="tm-footer-social-link tm-footer-instagram-link"
                aria-label="Follow TradeMax on Instagram @patil_trader01"
                title="Official TradeMax Instagram @patil_trader01"
              >
                <svg
                  width="16"
                  height="16"
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
                <span>@patil_trader01</span>
              </a>

              {/* Official Contact Phone */}
              <a
                href="tel:+916352461137"
                className="tm-footer-social-link tm-footer-phone-link"
                aria-label="Call TradeMax: 6352461137"
                title="Call TradeMax: 6352461137"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>6352461137</span>
              </a>
            </div>
          </div>

          {/* Thin Horizontal Divider */}
          <div className="tm-footer-bottom-divider" />

          {/* Bottom Row: Copyright & Back to Top */}
          <div className="tm-footer-bottom-row">
            <span className="tm-footer-copy-text">&copy; TRADEMAX BY PATIL TRADER</span>
            <button
              type="button"
              onClick={scrollToTop}
              className="tm-footer-back-top-btn"
              aria-label="Back to top"
            >
              BACK TO TOP &uarr;
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
