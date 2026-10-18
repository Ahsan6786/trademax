import React, { useState, useEffect, useRef } from 'react';
import './Hero.css';

export const Hero = ({ onOpenAuth, onNavigate }) => {
  const trackRef = useRef(null);
  const videoRef = useRef(null);
  const mobileVideoRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

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

  return (
    <>
      {/* ===================================================================
          1. MOBILE HERO SECTION (Visible only on mobile <= 768px)
          Strict Order:
          1. Tagline / Eyebrow
          2. Static Headline (with fade-in animation)
          3. Natural Description
          4. SUPERCHARGED SUPERCHARTS TERMINAL label & Video Preview
          5. Explore Courses Button
          6. Register Button
          =================================================================== */}
      <section className="tm-hero-mobile-section" aria-label="TradeMax Mobile Hero">
        <div className="tm-hero-mobile-container">

          {/* 2. Hero Heading (Static with subtle fade-up animation) */}
          <h1 className="tm-hero-mobile-headline">
            Disciplined Strategy. Consistent <span className="tm-hero-mobile-red">Edge.</span>
          </h1>

          {/* 3. Short Hero Description */}
          <p className="tm-hero-mobile-subtitle">
            Build your trading skills with practical lessons in chart reading, market structure, and risk management.
          </p>

          {/* 4. Terminal Preview Video (ABOVE buttons on mobile, label removed) */}
          <div className="tm-hero-mobile-visuals" aria-label="Live Market Trading Showcase">
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

          {/* 5 & 6. Two Action Buttons placed below video: Explore Courses & Register */}
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

          {/* Client-Provided Key Highlights & Track Record Claims (Mobile) */}
          <div className="tm-hero-stats-panel" aria-label="TradeMax Key Highlights">
            <div className="tm-hero-stats-grid">
              <div className="tm-hero-stat-card">
                <span className="tm-hero-stat-val">5+ Years</span>
                <span className="tm-hero-stat-lbl">Trading Experience</span>
              </div>
              <div className="tm-hero-stat-card">
                <span className="tm-hero-stat-val">84%</span>
                <span className="tm-hero-stat-lbl">Win Ratio*</span>
              </div>
              <div className="tm-hero-stat-card">
                <span className="tm-hero-stat-val">700+ Students</span>
                <span className="tm-hero-stat-lbl">FINXPO 2025</span>
              </div>
              <div className="tm-hero-stat-card">
                <span className="tm-hero-stat-val">60+ Participants</span>
                <span className="tm-hero-stat-lbl">Resort Trading Experience</span>
              </div>
              <div className="tm-hero-stat-card tm-hero-stat-card-wide">
                <span className="tm-hero-stat-val">Institutional</span>
                <span className="tm-hero-stat-lbl">Liquidity-Based Trading Strategy</span>
              </div>
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
                alt="Patil Trader — Founder of TRADEMAX"
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

                  {/* Client-Provided Key Highlights & Track Record Claims (Desktop) */}
                  <div className="tm-hero-stats-panel" aria-label="TradeMax Key Highlights">
                    <div className="tm-hero-stats-grid">
                      <div className="tm-hero-stat-card">
                        <span className="tm-hero-stat-val">5+ Years</span>
                        <span className="tm-hero-stat-lbl">Trading Experience</span>
                      </div>
                      <div className="tm-hero-stat-card">
                        <span className="tm-hero-stat-val">84%</span>
                        <span className="tm-hero-stat-lbl">Win Ratio*</span>
                      </div>
                      <div className="tm-hero-stat-card">
                        <span className="tm-hero-stat-val">Institutional</span>
                        <span className="tm-hero-stat-lbl">Liquidity Strategy</span>
                      </div>
                      <div className="tm-hero-stat-card tm-hero-stat-card-half">
                        <span className="tm-hero-stat-val">700+ Students</span>
                        <span className="tm-hero-stat-lbl">FINXPO 2025</span>
                      </div>
                      <div className="tm-hero-stat-card tm-hero-stat-card-half">
                        <span className="tm-hero-stat-val">60+ Participants</span>
                        <span className="tm-hero-stat-lbl">Resort Trading Experience</span>
                      </div>
                    </div>
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
