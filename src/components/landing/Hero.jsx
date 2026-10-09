import React, { useState, useEffect, useRef } from 'react';
import './Hero.css';

export const Hero = ({ onOpenAuth, onNavigate }) => {
  const trackRef = useRef(null);
  const videoRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Smooth scroll sync via requestAnimationFrame
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

  // Autoplay video when revealed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // Easing helpers
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);
  const mapRange = (val, inMin, inMax, outMin, outMax) => {
    const t = clamp((val - inMin) / (inMax - inMin));
    return outMin + t * (outMax - outMin);
  };

  const p = scrollProgress;

  // Layer 1: Reff Hero Transition on scroll
  const heroOpacity = p <= 0.05 ? 1 : mapRange(p, 0.05, 0.28, 1, 0);
  const heroY = easeInOutCubic(clamp(p / 0.28)) * -40;
  const heroPointerEvents = p > 0.22 ? 'none' : 'auto';

  // Layer 2: Supercharged Supercharts Theater on scroll
  const superchartsLayerOpacity = clamp(mapRange(p, 0.08, 0.30, 0, 1));
  const headlineT = easeOutCubic(clamp(mapRange(p, 0.16, 0.50, 0, 1)));
  const headlineOpacity = headlineT;
  const headlineY = (1 - headlineT) * -50;
  const videoT = easeOutCubic(clamp(mapRange(p, 0.12, 0.70, 0, 1)));
  const videoY = (1 - videoT) * 46;
  const videoScale = mapRange(videoT, 0, 1, 0.85, 1.0);
  const videoOpacity = mapRange(videoT, 0, 1, 0.55, 1.0);

  return (
    <section
      ref={trackRef}
      className="tm-hero-scroll-track"
      aria-label="TradeMax Homepage Hero"
    >
      <div className="tm-hero-sticky-stage">
        {/* =================================================================
           LAYER 1: The Exact Hero Section from reff.png
           ================================================================= */}
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
            {/* Smooth gradient blend to pure white for perfect text contrast */}
            <div className="tm-reff-art-blend-left"></div>
            <div className="tm-reff-art-blend-bottom"></div>
          </div>

          {/* Foreground Hero Content Grid */}
          <div className="tm-reff-hero-inner">
            <div className="tm-reff-hero-main-row">
              {/* Left Column: Headlines & CTAs */}
              <div className="tm-reff-hero-left">
                {/* Eyebrow */}
                <div className="tm-reff-eyebrow">
                  DISCIPLINE &nbsp;·&nbsp; STRATEGY &nbsp;·&nbsp; CONSISTENCY
                </div>

                {/* Bold Headline */}
                <h1 className="tm-reff-headline">
                  <span className="tm-reff-headline-line">From</span>
                  <span className="tm-reff-headline-line">Knowledge</span>
                  <span className="tm-reff-headline-line">
                    to <span className="tm-reff-red-word">Profits.</span>
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="tm-reff-subtitle">
                  Learn, practice and grow with structured trading courses, real market insights and a powerful trading terminal.
                </p>

                {/* CTA Action Buttons */}
                <div className="tm-reff-actions">
                  <button
                    type="button"
                    className="tm-reff-btn-courses"
                    onClick={(e) => onOpenAuth && onOpenAuth(e.currentTarget, 'register')}
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

        {/* =================================================================
           LAYER 2: Supercharged Supercharts Theater on Pure White Canvas
           ================================================================= */}
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
  );
};

export default Hero;
