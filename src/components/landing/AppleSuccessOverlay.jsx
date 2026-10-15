import React, { useState, useEffect, useRef } from 'react';
import welcomeAnimationData from '../../Welcome.json';
import './AppleSuccessOverlay.css';

export const AppleSuccessOverlay = ({ type = 'register', user, onContinue }) => {
  const [stage, setStage] = useState('welcome'); // 'welcome' | 'card'
  const lottieContainerRef = useRef(null);
  const animInstanceRef = useRef(null);

  // Initialize and play Welcome.json Lottie animation
  useEffect(() => {
    if (stage === 'welcome' && lottieContainerRef.current) {
      const lottiePlayer = typeof window !== 'undefined' ? window.lottie : null;
      if (!lottiePlayer) {
        setStage('card');
        return;
      }

      animInstanceRef.current = lottiePlayer.loadAnimation({
        container: lottieContainerRef.current,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        animationData: welcomeAnimationData,
      });

      // Play smoothly at 1.25x speed (~2.5s)
      animInstanceRef.current.setSpeed(1.25);

      animInstanceRef.current.addEventListener('complete', () => {
        setStage('card');
      });

      return () => {
        if (animInstanceRef.current) {
          animInstanceRef.current.destroy();
        }
      };
    }
  }, [stage]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        if (stage === 'welcome') {
          setStage('card');
        } else {
          onContinue();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, onContinue]);

  return (
    <div
      className={`tm-welcome-backdrop ${stage === 'welcome' ? 'tm-welcome-blackout' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tm-welcome-title"
    >
      {stage === 'welcome' ? (
        <div className="welcome-lottie-stage" aria-label="Welcome to TRADEMAX animation">
          <div ref={lottieContainerRef} className="welcome-lottie-wrap" />
        </div>
      ) : (
        <div
          className="tm-welcome-card"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="tm-welcome-title" className="tm-welcome-title">
            Welcome to <span className="tm-brand-trade-black">TRADE</span><span className="tm-brand-max-red">MAX</span>
          </h2>

          <div className="tm-welcome-body">
            <p className="tm-welcome-alert">
              ⚠️ Seats are limited, so complete your form at the earliest!
            </p>
            <p className="tm-welcome-sub">
              Once you submit the form, our team will connect with you regarding the next steps.
            </p>
          </div>

          <button
            type="button"
            className="tm-welcome-btn"
            onClick={onContinue}
            autoFocus
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
};
