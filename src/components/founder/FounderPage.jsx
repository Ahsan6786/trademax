import React from 'react';
import { ArrowLeft, ArrowRight, Images, Compass, Shield, Target, BookOpen } from 'lucide-react';
import { FOUNDER_IMAGES } from '../gallery/founderImagesData';
import './FounderPage.css';

export const FounderPage = ({ onNavigate, onBack, theme = 'dark' }) => {
  const mainPhoto = FOUNDER_IMAGES[0]; // Dubai Shelby night
  const expoPhoto = FOUNDER_IMAGES[2]; // Forex Expo Dubai 2026
  const showcasePhoto = FOUNDER_IMAGES[1]; // WINPROFX global markets

  return (
    <div className={`tm-founder-page tm-fnd-theme-${theme}`}>
      {/* Top Breadcrumb Navigation */}
      <div className="tm-fnd-breadcrumb-bar">
        <div className="tm-fnd-container">
          <div className="tm-fnd-nav-actions">
            <button
              type="button"
              className="tm-fnd-back-btn"
              onClick={() => (onBack ? onBack() : onNavigate ? onNavigate('landing') : null)}
              aria-label="Back to home"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div className="tm-fnd-breadcrumbs">
              <span
                className="tm-crumb-link"
                onClick={() => onNavigate && onNavigate('landing')}
              >
                Home
              </span>
              <span className="tm-crumb-sep">/</span>
              <span className="tm-crumb-current">Founder</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          HERO SECTION: BRAND HEADING & EDITORIAL PRESENTATION
          ------------------------------------------------------------------ */}
      <section className="tm-fnd-hero-section">
        <div className="tm-fnd-container">
          <div className="tm-fnd-hero-grid">
            {/* Left: Brand Heading, Tagline & Philosophy */}
            <div className="tm-fnd-hero-content">
              <div className="tm-fnd-eyebrow">
                <span className="tm-fnd-dot"></span>
                <span>FOUNDER &amp; VISION</span>
              </div>

              <h1 className="tm-fnd-brand-heading">
                TRADEMAX <span className="tm-fnd-byline">BY PATIL TRADER</span>
              </h1>

              <div className="tm-fnd-tagline-badge">
                <span>Learn</span>
                <span className="tm-tag-sep">•</span>
                <span>Practice</span>
                <span className="tm-tag-sep">•</span>
                <span>Develop</span>
                <span className="tm-tag-sep">•</span>
                <span>Trade</span>
              </div>

              <div className="tm-fnd-narrative">
                <p className="tm-fnd-lead">
                  TradeMax was founded by Patil Trader to bring transparent, structured market understanding to independent retail traders.
                </p>
                <p className="tm-fnd-paragraph">
                  Built upon the core philosophy of financial discipline, TradeMax focuses on institutional market mechanics, technical price structure, and systematic risk management — eliminating guesswork from modern trading.
                </p>
              </div>

              <div className="tm-fnd-hero-ctas">
                <button
                  type="button"
                  className="tm-btn-fnd-primary"
                  onClick={() => onNavigate && onNavigate('gallery')}
                >
                  <Images size={16} />
                  <span>Explore Photo Gallery</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="tm-btn-fnd-secondary"
                  onClick={() => onNavigate && onNavigate('courses')}
                >
                  <span>Explore Programs</span>
                </button>
              </div>
            </div>

            {/* Right: Featured Portrait Photograph */}
            <div className="tm-fnd-hero-photo-wrap">
              <div
                className="tm-fnd-photo-frame"
                onClick={() => onNavigate && onNavigate('gallery')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (onNavigate) onNavigate('gallery');
                  }
                }}
                aria-label="View full size photo in gallery"
              >
                <img
                  src={mainPhoto.src}
                  alt={mainPhoto.alt}
                  className="tm-fnd-hero-img"
                  loading="eager"
                />
                <div className="tm-fnd-photo-caption-bar">
                  <span className="tm-fnd-caption-name">Patil Trader</span>
                  <span className="tm-fnd-caption-tag">Founder · TRADEMAX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          THE FOUR FOUNDATIONAL PILLARS
          ------------------------------------------------------------------ */}
      <section className="tm-fnd-pillars-section">
        <div className="tm-fnd-container">
          <div className="tm-fnd-section-header">
            <span className="tm-fnd-sub-eyebrow">THE TRADEMAX PRINCIPLES</span>
            <h2 className="tm-fnd-section-title">Engineered for Consistency</h2>
            <p className="tm-fnd-section-desc">
              Four fundamental disciplines that guide every curriculum, mentorship session, and execution strategy.
            </p>
          </div>

          <div className="tm-fnd-pillars-grid">
            <div className="tm-fnd-pillar-item">
              <div className="tm-pillar-num-wrap">
                <span className="tm-pillar-num">01</span>
                <BookOpen size={20} className="tm-pillar-icon" />
              </div>
              <h3 className="tm-pillar-title">Learn</h3>
              <p className="tm-pillar-desc">
                Understand the foundational mechanics of global financial markets, liquidity dynamics, and institutional order flow.
              </p>
            </div>

            <div className="tm-fnd-pillar-item">
              <div className="tm-pillar-num-wrap">
                <span className="tm-pillar-num">02</span>
                <Target size={20} className="tm-pillar-icon" />
              </div>
              <h3 className="tm-pillar-title">Practice</h3>
              <p className="tm-pillar-desc">
                Refine technical execution through systematic backtesting, chart analysis, and simulated market observation.
              </p>
            </div>

            <div className="tm-fnd-pillar-item">
              <div className="tm-pillar-num-wrap">
                <span className="tm-pillar-num">03</span>
                <Compass size={20} className="tm-pillar-icon" />
              </div>
              <h3 className="tm-pillar-title">Develop</h3>
              <p className="tm-pillar-desc">
                Cultivate psychological stamina, risk management rules, and the patience necessary for long-term survival.
              </p>
            </div>

            <div className="tm-fnd-pillar-item">
              <div className="tm-pillar-num-wrap">
                <span className="tm-pillar-num">04</span>
                <Shield size={20} className="tm-pillar-icon" />
              </div>
              <h3 className="tm-pillar-title">Trade</h3>
              <p className="tm-pillar-desc">
                Execute defined strategies with clarity, strict risk controls, and unwavering emotional control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          EDITORIAL PHOTO ESSAY: GLOBAL MARKETS & EXPOS
          ------------------------------------------------------------------ */}
      <section className="tm-fnd-essay-section">
        <div className="tm-fnd-container">
          <div className="tm-fnd-essay-header">
            <div>
              <span className="tm-fnd-sub-eyebrow">INTERNATIONAL ECOSYSTEM</span>
              <h2 className="tm-fnd-section-title">Global Markets &amp; Expos</h2>
            </div>
            <button
              type="button"
              className="tm-btn-fnd-link"
              onClick={() => onNavigate && onNavigate('gallery')}
            >
              <span>View All Photographs</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="tm-fnd-essay-grid">
            {/* Photo 1: Forex Expo Dubai */}
            <div
              className="tm-fnd-essay-item"
              onClick={() => onNavigate && onNavigate('gallery')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (onNavigate) onNavigate('gallery');
                }
              }}
              aria-label="View in gallery: Forex Expo Dubai"
            >
              <div className="tm-fnd-essay-img-wrap">
                <img
                  src={expoPhoto.src}
                  alt={expoPhoto.alt}
                  className="tm-fnd-essay-img"
                  loading="lazy"
                />
              </div>
              <div className="tm-fnd-essay-meta">
                <span className="tm-fnd-essay-location">DUBAI, UAE</span>
                <h4 className="tm-fnd-essay-title">Forex Expo Dubai 2026</h4>
                <p className="tm-fnd-essay-desc">
                  Connecting with leading brokers, institutional providers, and international market participants.
                </p>
              </div>
            </div>

            {/* Photo 2: Global Markets Showcase */}
            <div
              className="tm-fnd-essay-item"
              onClick={() => onNavigate && onNavigate('gallery')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (onNavigate) onNavigate('gallery');
                }
              }}
              aria-label="View in gallery: Global Markets Showcase"
            >
              <div className="tm-fnd-essay-img-wrap">
                <img
                  src={showcasePhoto.src}
                  alt={showcasePhoto.alt}
                  className="tm-fnd-essay-img"
                  loading="lazy"
                />
              </div>
              <div className="tm-fnd-essay-meta">
                <span className="tm-fnd-essay-location">GLOBAL MARKETS</span>
                <h4 className="tm-fnd-essay-title">WINPROFX Showcase</h4>
                <p className="tm-fnd-essay-desc">
                  Bringing perspective, discipline, and advanced execution models to global trading environments.
                </p>
              </div>
            </div>
          </div>

          {/* Large Bottom Gallery Callout */}
          <div className="tm-fnd-gallery-callout">
            <div className="tm-fnd-callout-inner">
              <div className="tm-fnd-callout-text">
                <h3>Explore the Full Visual Archive</h3>
                <p>View all high-resolution photographs capturing the journey behind TRADEMAX.</p>
              </div>
              <button
                type="button"
                className="tm-btn-fnd-callout"
                onClick={() => onNavigate && onNavigate('gallery')}
              >
                <Images size={18} />
                <span>Open Dedicated Gallery</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FounderPage;
