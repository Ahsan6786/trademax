import React, { useState, useEffect } from 'react';
import './CourseDetailsPage.css';

export const CourseDetailsPage = ({
  onBack,
  onRegister,
  onNavigate,
  course,
  settings,
  user,
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
  const [dbCourse, setDbCourse] = useState(typeof course === 'object' ? course : null);
  const [isEnrolled, setIsEnrolled] = useState(Boolean(course?.is_enrolled));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    let isMounted = true;
    const targetSlugOrId =
      typeof course === 'string' || typeof course === 'number'
        ? course
        : course?.slug || course?.id || 'trading-masterclass';

    const token = localStorage.getItem('tm_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    setLoading(true);
    fetch(`/api/courses/${targetSlugOrId}`, { headers, credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.course) {
          setDbCourse(data.course);
          setIsEnrolled(Boolean(data.isEnrolled || data.course.is_enrolled));
        } else if (typeof course === 'object' && course !== null) {
          setDbCourse(course);
          setIsEnrolled(Boolean(course.is_enrolled));
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch course details from backend:', err);
        if (isMounted && typeof course === 'object' && course !== null) {
          setDbCourse(course);
          setIsEnrolled(Boolean(course.is_enrolled));
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [course]);

  const activeCourse = dbCourse || (typeof course === 'object' ? course : null);

  const isEnquiryOnly =
    activeCourse?.is_enquiry_only ||
    activeCourse?.slug === 'villa-trading-experience' ||
    parseFloat(activeCourse?.price || 0) === 0;

  // Derive topics dynamically from course if available
  let dynamicTopics = [];
  if (Array.isArray(activeCourse?.topics)) {
    dynamicTopics = activeCourse.topics;
  } else if (typeof activeCourse?.topics === 'string') {
    try {
      const parsed = JSON.parse(activeCourse.topics);
      if (Array.isArray(parsed)) dynamicTopics = parsed;
      else dynamicTopics = [activeCourse.topics];
    } catch {
      dynamicTopics = activeCourse.topics.split(',').map((t) => t.trim());
    }
  }

  const whatYoullLearn = dynamicTopics.length > 0 ? dynamicTopics : [
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

  const title = activeCourse?.title || 'Basics to Advanced Course';
  const rawSubtitle = activeCourse?.subtitle || 'Forex & Crypto Trading';
  const subtitle = rawSubtitle
    .replace(/\s*[—–-]\s*Basic to Advanced/gi, '')
    .replace(/Basic to Advanced/gi, '')
    .trim();
  const description =
    activeCourse?.description ||
    'A structured program designed to build strong foundations in financial markets, technical analysis, trading psychology, and risk management across Forex and Crypto markets.';
  const thumbnail = activeCourse?.thumbnail || '/1-c.jpeg';
  const price = activeCourse?.price !== undefined ? parseFloat(activeCourse.price) : 20000;
  const originalPrice =
    activeCourse?.original_price !== undefined ? parseFloat(activeCourse.original_price) : 25000;
  const discountLabel =
    activeCourse?.discount_label ||
    (originalPrice > price ? `Save ₹${(originalPrice - price).toLocaleString('en-IN')}` : '');
  const duration = activeCourse?.duration || '30 Days';
  const mode = activeCourse?.learning_mode || 'Live Online';
  const batchName = activeCourse?.batch_name || settings?.batchName || 'November';
  const isPublished = activeCourse?.is_published !== undefined ? Boolean(activeCourse.is_published) : true;


  return (
    <div className={`tm-cdp-root tm-theme-${activeTheme}`}>
      {/* 1. BACK NAVIGATION */}
      <section className="tm-cdp-breadcrumb-bar" aria-label="Navigation">
        <div className="tm-cdp-container">
          <div className="tm-cdp-breadcrumb-inner">
            <button
              type="button"
              className="tm-cdp-back-btn"
              onClick={(e) => {
                if (e && e.preventDefault) e.preventDefault();
                if (onBack) onBack(e);
              }}
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
                      {isEnquiryOnly ? (
                        <span className="tm-cdp-price-bold" style={{ fontSize: '22px', color: '#B45309' }}>Contact for Pricing</span>
                      ) : (
                        <>
                          <span className="tm-cdp-price-bold">₹{price.toLocaleString('en-IN')}</span>
                          {originalPrice > price && (
                            <span className="tm-cdp-price-strike">₹{originalPrice.toLocaleString('en-IN')}</span>
                          )}
                          {discountLabel && (
                            <span className="tm-cdp-savings-badge">{discountLabel}</span>
                          )}
                        </>
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
                    {isEnrolled ? (
                      <div className="tm-cdp-enrolled-action-wrap">
                        <div className="tm-cdp-enrolled-status-badge">
                          <span className="tm-cdp-badge-check" aria-hidden="true">✓</span>
                          <span>ENROLLED</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="tm-cdp-btn-register"
                        onClick={() => {
                          if (onRegister) onRegister(activeCourse);
                        }}
                        disabled={!isPublished}
                        style={
                          !isPublished
                            ? { opacity: 0.6, cursor: 'not-allowed', background: '#475569' }
                            : isEnquiryOnly
                            ? { background: '#B45309', borderColor: '#B45309' }
                            : {}
                        }
                      >
                        {!isPublished
                          ? 'ADMISSIONS TEMPORARILY CLOSED'
                          : isEnquiryOnly
                          ? 'ENQUIRE NOW'
                          : 'REGISTER FOR COURSE'}
                      </button>
                    )}
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
                      <span className="tm-cdp-table-val">{duration}</span>
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
