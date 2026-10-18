import React, { useState, useEffect, useRef } from 'react';
import welcomeAnimationData from '../../Welcome.json';
import { authService } from '../../services/auth';
import './AppleSuccessOverlay.css';

/**
 * AppleSuccessOverlay
 * Plays the Welcome.json Lottie animation on first-time signup with smooth
 * backdrop, mobile-responsive layout, and seamless transition to dashboard.
 */
export const AppleSuccessOverlay = ({ user, onContinue }) => {
  const lottieContainerRef = useRef(null);
  const animInstanceRef = useRef(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const hasFinishedRef = useRef(false);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsFinishing(true);

    if (user) {
      authService.markWelcomeSeen(user).catch(() => {});
    }

    if (animInstanceRef.current) {
      try {
        animInstanceRef.current.destroy();
      } catch (e) {
        // Ignore destroy error
      }
    }

    setTimeout(() => {
      if (onContinue) {
        onContinue();
      }
    }, 280);
  };

  useEffect(() => {
    let isCancelled = false;

    const initLottie = async () => {
      // 1. Resolve Lottie player (window.lottie from /lottie.min.js)
      let lottiePlayer = typeof window !== 'undefined' ? window.lottie : null;
      if (!lottiePlayer) {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 50));
          if (typeof window !== 'undefined' && window.lottie) {
            lottiePlayer = window.lottie;
            break;
          }
        }
      }

      if (isCancelled || !lottieContainerRef.current) return;

      if (!lottiePlayer) {
        console.warn('[Welcome] Lottie player not detected, skipping animation.');
        handleFinish();
        return;
      }

      try {
        animInstanceRef.current = lottiePlayer.loadAnimation({
          container: lottieContainerRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          animationData: welcomeAnimationData,
        });

        // Play smoothly at 1.25x speed
        animInstanceRef.current.setSpeed(1.25);

        animInstanceRef.current.addEventListener('complete', () => {
          setTimeout(() => {
            handleFinish();
          }, 350);
        });

        animInstanceRef.current.addEventListener('error', (e) => {
          console.warn('[Welcome] Animation playback error:', e);
          handleFinish();
        });
      } catch (err) {
        console.error('[Welcome] Could not initialize Lottie animation:', err);
        handleFinish();
      }
    };

    initLottie();

    return () => {
      isCancelled = true;
      if (animInstanceRef.current) {
        try {
          animInstanceRef.current.destroy();
        } catch (e) {}
      }
    };
  }, []);

  // Keyboard shortcut listener (Enter, Space, Escape to skip/continue)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={`tm-welcome-backdrop tm-welcome-blackout ${isFinishing ? 'tm-welcome-fade-out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to TRADEMAX"
      onClick={handleFinish}
    >
      <div
        className="welcome-lottie-stage"
        onClick={(e) => {
          e.stopPropagation();
          handleFinish();
        }}
      >
        <div ref={lottieContainerRef} className="welcome-lottie-wrap" />
        <button
          type="button"
          className="welcome-skip-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          title="Continue to dashboard"
        >
          Skip &rarr;
        </button>
      </div>
    </div>
  );
};
