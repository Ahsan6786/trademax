import React, { useState, useEffect, useRef } from 'react';
import './Hero.css';

const TYPEWRITER_HEADLINES = [
  'From Knowledge to Profits.',
  'Master Institutional Order Flow.',
  'Precision Forex & Crypto Execution.',
  'Disciplined Strategy. Consistent Edge.',
];

export const Hero = ({ onOpenAuth, onNavigate }) => {
  const trackRef = useRef(null);
  const videoRef = useRef(null);
  const mobileVideoRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Typewriter State for Mobile Hero
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentHeadline = TYPEWRITER_HEADLINES[headlineIndex];
    let timeout;

    if (!isDeleting) {
      if (displayText.length < currentHeadline.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentHeadline.slice(0, displayText.length + 1));
        }, 60);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(currentHeadline.slice(0, displayText.length - 1));
        }, 32);
      } else {
        setIsDeleting(false);
        setHeadlineIndex((prev) => (prev + 1) % TYPEWRITER_HEADLINES.length);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, headlineIndex]);

  // Smooth scroll sync via requestAnimationFrame for desktop & tablet
  useEffect(() => {
    let rafId = null;

    const calculateScroll = () => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;

      if (totalScrollable <= 0) {
        setScrollProgress(0);
        return;
      }

      const scrolled = -rect.top;
      const rawProgress = scrolled / totalScrollable;
      const clamped = Math.min(Math.max(rawProgress, 0), 1);
      setScrollProgress(clamped);
    };

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    calculateScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Autoplay videos when mounted
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    if (mobileVideoRef.current) {
      mobileVideoRef.current.play().catch(() => {});
    }
  }, []);

  // Easing helpers for desktop stage
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);
  const mapRange = (val, inMin, inMax, outMin, outMax) => {
    const t = clamp((val - inMin) / (inMax - inMin));
    return outMin + t * (outMax - outMin);
  };

  const p = scrollProgress;

  // Layer 1: Reff Hero Transition on scroll (Desktop)
  const heroOpacity = p <= 0.05 ? 1 : mapRange(p, 0.05, 0.28, 1, 0);
  const heroY = easeInOutCubic(clamp(p / 0.28)) * -40;
  const heroPointerEvents = p > 0.22 ? 'none' : 'auto';

  // Layer 2: Supercharged Supercharts Theater on scroll (Desktop)
  const superchartsLayerOpacity = clamp(mapRange(p, 0.08, 0.30, 0, 1));
  const headlineT = easeOutCubic(clamp(mapRange(p, 0.16, 0.50, 0, 1)));
  const headlineOpacity = headlineT;
  const headlineY = (1 - headlineT) * -50;
  const videoT = easeOutCubic(clamp(mapRange(p, 0.12, 0.70, 0, 1)));
  const videoY = (1 - videoT) * 46;
  const videoScale = mapRange(videoT, 0, 1, 0.85, 1.0);
  const videoOpacity = mapRange(videoT, 0, 1, 0.55, 1.0);

  // Helper to render red highlight in typewriter text
  const renderTypewriter = (text) => {
    const highlights = ['Profits.', 'Order Flow.', 'Execution.', 'Edge.'];
    for (const h of highlights) {
      if (text.includes(h)) {
        const parts = text.split(h);
        return (
          <>
            {parts[0]}
            <span className="tm-typewriter-red">{h}</span>
            {parts[1] || ''}
          </>
        );
      }
    }
    return text;
  };

  return (
    <>
      {/* ===================================================================
          1. MOBILE HERO SECTION (Visible only on mobile <= 768px)
          - Centered text with smooth typewriter cycling through trading headlines
          - Short description
          - Two prominent stacked buttons: Explore Courses and Register
          - All hero images, trading charts & visuals placed below the hero section
          =================================================================== */}
      <section className="tm-hero-mobile-section" aria-label="TradeMax Mobile Hero">
        <div className="tm-hero-mobile-container">
          {/* Eyebrow */}
          <div className="tm-hero-mobile-eyebrow">
            DISCIPLINE &nbsp;·&nbsp; STRATEGY &nbsp;·&nbsp; CONSISTENCY
          </div>

          {/* Typewriter Centered Headline */}
          <h1 className="tm-hero-mobile-headline">
            <span className="tm-typewriter-text">{renderTypewriter(displayText)}</span>
            <span className="tm-typewriter-caret" aria-hidden="true">|</span>
          </h1>

          {/* Short Description */}
          <p className="tm-hero-mobile-subtitle">
            Master institutional market structure, quantitative order flow, and disciplined risk management with India's premier trading academy.
          </p>

          {/* Two Prominent Buttons: Stacked Vertically */}
          <div className="tm-hero-mobile-actions">
            <button
              type="button"
              className="tm-mobile-btn-courses"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('courses');
                } else {
                  const el = document.getElementById('courses');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <span>Explore Courses</span>
              <span className="tm-btn-arrow" aria-hidden="true">&rarr;</span>
            </button>

            <button
              type="button"
              className="tm-mobile-btn-register"
              onClick={(e) => onOpenAuth && onOpenAuth(e.currentTarget, 'register')}
            >
              Register
            </button>
          </div>

          {/* Visuals moved cleanly below the hero text & buttons */}
          <div className="tm-hero-mobile-visuals" aria-label="Live Market Trading Showcase">
            <div className="tm-mobile-visuals-header">
              <span className="tm-mobile-pulse-dot" aria-hidden="true" />
              <span className="tm-mobile-visuals-label">SUPERCHARGED SUPERCHARTS TERMINAL</span>
            </div>
            <div className="tm-mobile-chart-frame">
              <video
                ref={mobileVideoRef}
                src="/vid.mp4"
                poster="/vid-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="tm-mobile-chart-video"
                aria-label="TradeMax Trading Terminal Video"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          2. DESKTOP & TABLET HERO SECTION (min-width: 769px)
          - Keeps existing desktop and tablet hero layouts completely unchanged
          =================================================================== */}
      <section
        ref={trackRef}
        className="tm-hero-scroll-track tm-hero-desktop-track"
        aria-label="TradeMax Homepage Hero"
      >
        <div className="tm-hero-sticky-stage">
          {/* LAYER 1: The Exact Hero Section from reff.png */}
          <div
            className="tm-reff-hero-viewport"
            style={{
              opacity: heroOpacity,
              transform: `translate3d(0, ${heroY}px, 0)`,
              pointerEvents: heroPointerEvents,
            }}
          >
            {/* Background Artwork: heroo.png positioned on the right */}
            <div className="tm-reff-art-backdrop" aria-hidden="true">
              <img
                src="/heroo.png"
                alt="TradeMax Sculptural Bull & Archway Artwork"
                className="tm-reff-art-img"
                loading="eager"
              />
              <div className="tm-reff-art-blend-left"></div>
              <div className="tm-reff-art-blend-bottom"></div>
            </div>

            {/* Foreground Hero Content Grid */}
            <div className="tm-reff-hero-inner">
              <div className="tm-reff-hero-main-row">
                <div className="tm-reff-hero-left">
                  <div className="tm-reff-eyebrow">
                    DISCIPLINE &nbsp;·&nbsp; STRATEGY &nbsp;·&nbsp; CONSISTENCY
                  </div>

                  <h1 className="tm-reff-headline">
                    <span className="tm-reff-headline-line">From</span>
                    <span className="tm-reff-headline-line">Knowledge</span>
                    <span className="tm-reff-headline-line">
                      to <span className="tm-reff-red-word">Profits.</span>
                    </span>
                  </h1>

                  <p className="tm-reff-subtitle">
                    Learn, practice and grow with structured trading courses, real market insights and a powerful trading terminal.
                  </p>

                  <div className="tm-reff-actions">
                    <button
                      type="button"
                      className="tm-reff-btn-courses"
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('courses');
                        } else {
                          const el = document.getElementById('courses');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      <span>Explore Courses</span>
                      <span className="tm-reff-arrow" aria-hidden="true">&rarr;</span>
                    </button>

                    <button
                      type="button"
                      className="tm-reff-btn-terminal"
                      onClick={(e) => onOpenAuth && onOpenAuth(e.currentTarget, 'register')}
                    >
                      Register
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LAYER 2: Supercharged Supercharts Theater */}
          <div
            className="tm-supercharts-theater"
            style={{ opacity: superchartsLayerOpacity, pointerEvents: p > 0.22 ? 'auto' : 'none' }}
            aria-hidden={p < 0.15}
          >
            <div className="tm-supercharts-inner">
              <div
                className="tm-supercharts-header"
                style={{
                  opacity: headlineOpacity,
                  transform: `translate3d(0, ${headlineY}px, 0)`,
                }}
              >
                <h2 className="tm-supercharts-title">
                  Supercharged<br />Supercharts
                </h2>
              </div>

              <div
                className="tm-supercharts-video-wrap"
                style={{
                  opacity: videoOpacity,
                  transform: `translate3d(0, ${videoY}vh, 0) scale(${videoScale})`,
                }}
              >
                <div className="tm-supercharts-video-frame">
                  <video
                    ref={videoRef}
                    src="/vid.mp4"
                    poster="/vid-poster.jpg"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="tm-supercharts-video"
                    aria-label="TradeMax Supercharged Supercharts Terminal"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
