import React, { useState, useEffect } from 'react';
import './CourseDetailsPage.css';

export const CourseDetailsPage = ({
  onBack,
  onRegister,
  course,
  settings,
  theme: propTheme,
  onToggleTheme,
}) => {
  const [internalTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tm_course_theme') || 'dark';
    }
    return 'dark';
  });

  const activeTheme = propTheme || internalTheme;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  const whatYoullLearn = [
    'Forex & Crypto Institutional Trading',
    'Technical Analysis & Market Structure',
    'Trading Psychology & Discipline',
    'Risk Management & Trade Planning',
    'Strategy Development',
    'Backtesting & Forward Testing',
    'Live Market Analysis for Educational Practice',
    'Trade Execution & Management',
    'TradingView & Chart Analysis',
    'General Account-Opening Guidance',
    'Common Trading Mistakes and How to Avoid Them',
  ];

  const programBenefits = [
    'Premium Telegram Group Access',
    'Market and Trade Discussions',
    'Practical Learning Environment',
    'Ongoing Educational Guidance and Support',
    'Community Access through TradeMax',
    'One-Day Live Trading Session with Traders',
    'Real-Time Market Analysis for Educational Purposes',
    'Entry, Stop-Loss, and Take-Profit Planning',
    'Trade Management, Trading Psychology, and Risk Management Discussions',
  ];

  const title = course?.title || 'Trading Masterclass';
  const rawSubtitle = course?.subtitle || 'Forex & Crypto Trading';
  const subtitle = rawSubtitle
    .replace(/\s*[—–-]\s*Basic to Advanced/gi, '')
    .replace(/Basic to Advanced/gi, '')
    .trim();
  const description =
    course?.description ||
    'A structured one-month online program designed to build strong foundations in financial markets, technical analysis, trading psychology, and risk management across Forex and Crypto markets.';
  const thumbnail = course?.thumbnail || '/1-c.jpeg';
  const price = course?.price !== undefined ? parseFloat(course.price) : 19999;
  const originalPrice =
    course?.original_price !== undefined ? parseFloat(course.original_price) : 24999;
  const discountLabel =
    course?.discount_label ||
    (originalPrice > price ? `Save ₹${(originalPrice - price).toLocaleString('en-IN')}` : '');
  const duration = course?.duration || '1 Month';
  const mode = course?.learning_mode || 'Online';
  const batchName = course?.batch_name || settings?.batchName || 'November';
  const isPublished = course?.is_published !== undefined ? Boolean(course.is_published) : true;

  return (
    <div className={`tm-cdp-root tm-theme-${activeTheme}`}>
      {/* 1. BACK NAVIGATION */}
      <section className="tm-cdp-breadcrumb-bar" aria-label="Navigation">
        <div className="tm-cdp-container">
          <div className="tm-cdp-breadcrumb-inner">
            <button
              type="button"
              className="tm-cdp-back-btn"
              onClick={onBack}
              aria-label="Back to courses"
            >
              <span className="tm-cdp-back-arrow" aria-hidden="true">&larr;</span> Back
            </button>
          </div>
        </div>
      </section>

      {/* 2. MAIN COURSE SECTION (TWO-COLUMN: POSTER + PRICING PANEL WITH IDENTICAL HEIGHT) */}
      <section className="tm-cdp-hero-section" aria-label="Course Overview">
        <div className="tm-cdp-container">
          <div className="tm-cdp-hero-grid tm-equal-height-grid">
            {/* LEFT COLUMN: Large Course Poster Card */}
            <div className="tm-cdp-poster-column">
              <div className="tm-cdp-poster-frame">
                <img
                  src={thumbnail}
                  alt={`${title} Course Poster`}
                  className="tm-cdp-poster-img"
                  loading="eager"
                  onError={(e) => {
                    e.target.src = '/1-c.jpeg';
                  }}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Matching Height Pricing & Enrollment Panel */}
            <div className="tm-cdp-pricing-column">
              <div className="tm-cdp-pricing-panel">
                <div className="tm-cdp-panel-top">
                  <div className="tm-cdp-panel-header">
                    <h1 className="tm-cdp-course-title">{title}</h1>
                    <div className="tm-cdp-course-author">TRADEMAX BY PATIL TRADER</div>
                    <div className="tm-cdp-course-category">{subtitle}</div>
                  </div>

                  <div className="tm-cdp-panel-pricing">
                    <div className="tm-cdp-price-meta">
                      <span className="tm-cdp-price-bold">₹{price.toLocaleString('en-IN')}</span>
                      {originalPrice > price && (
                        <span className="tm-cdp-price-strike">₹{originalPrice.toLocaleString('en-IN')}</span>
                      )}
                      {discountLabel && (
                        <span className="tm-cdp-savings-badge">{discountLabel}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="tm-cdp-panel-middle">
                  <div className="tm-cdp-panel-specs">
                    <div className="tm-cdp-spec-row">
                      <span className="tm-cdp-spec-label">Duration:</span>
                      <span className="tm-cdp-spec-val">{duration}</span>
                    </div>
                    <div className="tm-cdp-spec-row">
                      <span className="tm-cdp-spec-label">Mode:</span>
                      <span className="tm-cdp-spec-val">{mode}</span>
                    </div>
                    <div className="tm-cdp-spec-row">
                      <span className="tm-cdp-spec-label">Batch:</span>
                      <span className="tm-cdp-spec-val">{batchName}</span>
                    </div>
                  </div>
                </div>

                <div className="tm-cdp-panel-bottom">
                  <div className="tm-cdp-panel-actions">
                    <button
                      type="button"
                      className="tm-cdp-btn-register"
                      onClick={onRegister}
                      disabled={!isPublished}
                      style={!isPublished ? { opacity: 0.6, cursor: 'not-allowed', background: '#475569' } : {}}
                    >
                      {isPublished ? 'REGISTER FOR COURSE' : 'ADMISSIONS TEMPORARILY CLOSED'}
                    </button>
                    <p className="tm-cdp-panel-warning">
                      Trading involves substantial risk. This program is for educational purposes only.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COURSE DESCRIPTION: BALANCED LEFT AND RIGHT FORMATTING */}
      <section className="tm-cdp-description-section" aria-label="Course Description">
        <div className="tm-cdp-container">
          <div className="tm-cdp-description-card">
            <h2 className="tm-cdp-desc-heading">Description</h2>

            <div className="tm-cdp-intro-block">
              <h3 className="tm-cdp-intro-title">{title}</h3>
              <p className="tm-cdp-intro-text">
                {description}
              </p>
            </div>

            {/* Balanced Two-Column Body: Formatted Left & Right Columns */}
            <div className="tm-cdp-desc-balanced-grid">
              {/* LEFT COLUMN: Curriculum & Mentor */}
              <div className="tm-cdp-desc-col">
                {/* What You'll Learn */}
                <div className="tm-cdp-sub-block">
                  <h4 className="tm-cdp-sub-title">What You'll Learn</h4>
                  <div className="tm-cdp-list-wrap">
                    {whatYoullLearn.map((item, idx) => (
                      <div key={idx} className="tm-cdp-bullet-item">
                        <span className="tm-cdp-bullet" aria-hidden="true">•</span>
                        <span className="tm-cdp-bullet-text">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* About the Mentor */}
                <div className="tm-cdp-sub-block tm-cdp-sub-card">
                  <h4 className="tm-cdp-sub-title">About the Mentor</h4>
                  <div className="tm-cdp-mentor-info">
                    <h5 className="tm-cdp-mentor-name">Patil Trader</h5>
                    <ul className="tm-cdp-mentor-list">
                      <li>Trading professional with 5+ years of active experience in financial markets.</li>
                      <li>President &amp; Founder of Club-TradeMax.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Benefits & Program Details */}
              <div className="tm-cdp-desc-col">
                {/* Program Benefits */}
                <div className="tm-cdp-sub-block">
                  <h4 className="tm-cdp-sub-title">Program Benefits</h4>
                  <div className="tm-cdp-list-wrap">
                    {programBenefits.map((benefit, idx) => (
                      <div key={idx} className="tm-cdp-bullet-item">
                        <span className="tm-cdp-bullet" aria-hidden="true">•</span>
                        <span className="tm-cdp-bullet-text">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Program Details */}
                <div className="tm-cdp-sub-block tm-cdp-sub-card">
                  <h4 className="tm-cdp-sub-title">Program Details</h4>
                  <div className="tm-cdp-details-table">
                    <div className="tm-cdp-table-row">
                      <span className="tm-cdp-table-label">Duration</span>
                      <span className="tm-cdp-table-val">1 Month</span>
                    </div>
                    <div className="tm-cdp-table-row">
                      <span className="tm-cdp-table-label">Mode</span>
                      <span className="tm-cdp-table-val">Online</span>
                    </div>
                    <div className="tm-cdp-table-row">
                      <span className="tm-cdp-table-label">Batch</span>
                      <span className="tm-cdp-table-val">{batchName}</span>
                    </div>
                    <div className="tm-cdp-table-row">
                      <span className="tm-cdp-table-label">Community</span>
                      <span className="tm-cdp-table-val">Telegram Group &amp; Live Session</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FULL-WIDTH BOTTOM: Trading Risk Disclaimer */}
            <div className="tm-cdp-disclaimer-full-block">
              <h4 className="tm-cdp-sub-title">Trading Risk Disclaimer</h4>
              <div className="tm-cdp-disclaimer-body">
                <p>
                  <strong>Educational Notice:</strong> Trading foreign exchange (Forex) and cryptocurrencies involves substantial risk of loss and is not suitable for all investors. High leverage and volatile price swings can work against you as well as for you.
                </p>
                <p>
                  This program is conducted exclusively for educational purposes and does not constitute financial, investment, or legal advice. TRADEMAX and Patil Trader do not provide guaranteed returns, investment management, or advisory services.
                </p>
                <p>
                  All chart breakdowns and live trade discussions are conducted exclusively for educational simulation. Participants are solely responsible for their own trading decisions and risk management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CourseDetailsPage;
