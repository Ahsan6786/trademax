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
    } else if (target === 'founder') {
      if (onNavigate) onNavigate('founder');
    } else if (target === 'gallery') {
      if (onNavigate) onNavigate('gallery');
    } else if (target === 'home') {
      if (onNavigate) onNavigate('landing');
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === 'dashboard') {
      if (onNavigate) onNavigate('dashboard');
      else {
        const el = document.getElementById('terminal');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="tm-site-footer" id="contact" aria-label="TRADEMAX Footer">
      {/* Subtle trading candlestick graphics behind the gradient */}
      <div className="tm-footer-candlesticks-bg" aria-hidden="true">
        <svg viewBox="0 0 1200 600" preserveAspectRatio="none" className="tm-candlesticks-svg">
          <g stroke="#000000" strokeWidth="1.6" fill="#000000" opacity="0.055">
            <line x1="60" y1="30" x2="60" y2="180" />
            <rect x="53" y="60" width="14" height="85" rx="1" />

            <line x1="140" y1="60" x2="140" y2="250" />
            <rect x="133" y="95" width="14" height="115" rx="1" />

            <line x1="220" y1="40" x2="220" y2="210" />
            <rect x="213" y="75" width="14" height="90" rx="1" />

            <line x1="300" y1="100" x2="300" y2="310" />
            <rect x="293" y="145" width="14" height="120" rx="1" />

            <line x1="380" y1="60" x2="380" y2="240" />
            <rect x="373" y="105" width="14" height="95" rx="1" />

            <line x1="460" y1="130" x2="460" y2="360" />
            <rect x="453" y="180" width="14" height="135" rx="1" />

            <line x1="540" y1="80" x2="540" y2="290" />
            <rect x="533" y="130" width="14" height="110" rx="1" />

            <line x1="620" y1="150" x2="620" y2="400" />
            <rect x="613" y="210" width="14" height="140" rx="1" />

            <line x1="700" y1="110" x2="700" y2="350" />
            <rect x="693" y="165" width="14" height="125" rx="1" />

            <line x1="780" y1="170" x2="780" y2="440" />
            <rect x="773" y="235" width="14" height="150" rx="1" />

            <line x1="860" y1="120" x2="860" y2="370" />
            <rect x="853" y="175" width="14" height="130" rx="1" />

            <line x1="940" y1="190" x2="940" y2="470" />
            <rect x="933" y="260" width="14" height="155" rx="1" />

            <line x1="1020" y1="140" x2="1020" y2="400" />
            <rect x="1013" y="200" width="14" height="130" rx="1" />

            <line x1="1100" y1="210" x2="1100" y2="500" />
            <rect x="1093" y="285" width="14" height="150" rx="1" />

            <line x1="1160" y1="160" x2="1160" y2="420" />
            <rect x="1153" y="220" width="14" height="130" rx="1" />
          </g>
        </svg>
      </div>

      <div className="tm-footer-inner-container">
        {/* Upper Section: Navigation Links */}
        <div className="tm-footer-upper-section">
          <nav className="tm-footer-nav" aria-label="Footer Navigation Links">
            <a href="#home" onClick={(e) => handleNav(e, 'home')} className="tm-footer-nav-link">
              <span>Home</span>
              <span className="tm-footer-link-arrow" aria-hidden="true">&rarr;</span>
            </a>
            <a href="#courses" onClick={(e) => handleNav(e, 'courses')} className="tm-footer-nav-link">
              <span>Courses</span>
              <span className="tm-footer-link-arrow" aria-hidden="true">&rarr;</span>
            </a>
            <a href="#terminal" onClick={(e) => handleNav(e, 'dashboard')} className="tm-footer-nav-link">
              <span>Trading Terminal</span>
              <span className="tm-footer-link-arrow" aria-hidden="true">&rarr;</span>
            </a>
            <a href="/founder" onClick={(e) => handleNav(e, 'founder')} className="tm-footer-nav-link">
              <span>About</span>
              <span className="tm-footer-link-arrow" aria-hidden="true">&rarr;</span>
            </a>
            <a href="tel:8799026206" className="tm-footer-nav-link">
              <span>Contact</span>
              <span className="tm-footer-link-arrow" aria-hidden="true">&rarr;</span>
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
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#FF252D" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="tm-wordmark-svg">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </span>
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
