import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import welcomeAnimationData from '../../Welcome.json';
import { authService } from '../../services/auth';
import './AppleSuccessOverlay.css';

/**
 * AppleSuccessOverlay
 * Plays the Welcome.json Lottie animation on first-time signup with smooth
 * backdrop, responsive viewport sizing, safe-area support, and seamless transition to dashboard.
 */
export const AppleSuccessOverlay = ({ user, onContinue }) => {
  const lottieContainerRef = useRef(null);
  const animInstanceRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const hasFinishedRef = useRef(false);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

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

  // 1. Immediately dismiss any open mobile virtual keyboard
  useEffect(() => {
    if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  }, []);

  // 2. Main Lottie Animation Lifecycle
  useEffect(() => {
    let isCancelled = false;

    // Check for user prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const rmTimer = setTimeout(() => {
        handleFinish();
      }, 350);
      return () => clearTimeout(rmTimer);
    }

    // Fallback safety timeout (4.8 seconds max duration) to ensure the user never gets stuck
    fallbackTimerRef.current = setTimeout(() => {
      console.warn('[Welcome] Animation safety timeout fired.');
      handleFinish();
    }, 4800);

    const initLottie = async () => {
      // Resolve Lottie player (window.lottie from /lottie.min.js)
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
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
            hideOnTransparent: true,
          },
        });

        // Smooth playback speed
        animInstanceRef.current.setSpeed(1.2);

        animInstanceRef.current.addEventListener('complete', () => {
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          setTimeout(() => {
            handleFinish();
          }, 300);
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
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`tm-welcome-backdrop tm-welcome-blackout ${isFinishing ? 'tm-welcome-fade-out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to TRADEMAX"
    >
      <div className="welcome-lottie-stage">
        <div ref={lottieContainerRef} className="welcome-lottie-wrap" />
      </div>
    </div>,
    document.body
  );
};
export default AppleSuccessOverlay;
