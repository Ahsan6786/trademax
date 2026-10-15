import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import './HomeGallerySection.css';

const GALLERY_ITEMS = [
  {
    id: 'dubai-summit',
    src: '/founder/083d7906-70de-437e-ac32-09e902bfb8cf.jpg',
    alt: 'Patil Trader, Founder of TRADEMAX, in Dubai',
    tag: 'Dubai',
    title: 'Dubai, UAE',
  },
  {
    id: 'winprofx-keynote',
    src: '/founder/bdff6eed-3aad-41bd-a826-804e30d8977f.JPG',
    alt: 'Patil Trader at WINPROFX Global Markets showcase',
    tag: 'Keynotes',
    title: 'Global Markets Showcase',
    isVideo: true,
  },
  {
    id: 'forex-expo',
    src: '/founder/f72e1486-e151-4d5e-8218-05f751b5c11f.JPG',
    alt: 'Patil Trader attending Forex Expo Dubai',
    tag: 'Forex Expo',
    title: 'Forex Expo Dubai',
  },
  {
    id: 'institutional-delegation',
    src: '/founder/083d7906-70de-437e-ac32-09e902bfb8cf.jpg',
    alt: 'Patil Trader with International Market Leaders',
    tag: 'Global Summits',
    title: 'Global Institutional Summit',
  },
  {
    id: 'community-keynote',
    src: '/founder/bdff6eed-3aad-41bd-a826-804e30d8977f.JPG',
    alt: 'Patil Trader trading community session',
    tag: 'Community',
    title: 'Community Keynote',
  },
];

const FILTER_TAGS = ['All', 'Dubai', 'Keynotes', 'Forex Expo', 'Global Summits', 'Community'];

export const HomeGallerySection = ({ onNavigate, theme = 'dark' }) => {
  const [activeIndex, setActiveIndex] = useState(2); // Center on Forex Expo / photo 2
  const [selectedTag, setSelectedTag] = useState('All');
  const touchStartXRef = useRef(null);
  const containerRef = useRef(null);

  const total = GALLERY_ITEMS.length;

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const handleTagClick = (tag) => {
    setSelectedTag(tag);
    if (tag === 'All') return;
    const matchIdx = GALLERY_ITEMS.findIndex((item) => item.tag === tag);
    if (matchIdx !== -1) {
      setActiveIndex(matchIdx);
    }
  };

  // Keyboard navigation when user is focused within section
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    }
  };

  // Touch Swipe for mobile devices
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  return (
    <section
      id="gallery-preview"
      className={`tm-gallery-card-section tm-gal-theme-${theme}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Gallery Section"
    >
      <div className="tm-gallery-ambient-glow" aria-hidden="true" />

      <div className="tm-gallery-card-container">
        {/* Main Floating Card UI from Reference */}
        <div className="tm-gallery-main-card">
          {/* Top Header */}
          <div className="tm-gallery-card-header">
            <span className="tm-gallery-card-eyebrow">GALLERY</span>
            <h2 className="tm-gallery-card-title">Gallery</h2>

            {/* Filter Pills / Tag List */}
            <div className="tm-gallery-pills-row" role="tablist" aria-label="Gallery Categories">
              {FILTER_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tm-gallery-pill-btn ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => handleTagClick(tag)}
                  role="tab"
                  aria-selected={selectedTag === tag}
                >
                  {tag}
                </button>
              ))}

              <button
                type="button"
                className="tm-gallery-pill-btn tm-gallery-pill-view-more"
                onClick={() => onNavigate && onNavigate('gallery')}
              >
                <span>View More</span>
                <ArrowRight size={13} className="tm-pill-arrow" />
              </button>
            </div>
          </div>

          {/* Perspective Fanned-Out Card Stage */}
          <div
            className="tm-gallery-carousel-viewport"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="tm-gallery-carousel-track">
              {GALLERY_ITEMS.map((item, index) => {
                // Calculate circular offset
                let offset = index - activeIndex;
                if (offset < -Math.floor(total / 2)) offset += total;
                if (offset > Math.floor(total / 2)) offset -= total;

                const isCenter = offset === 0;
                const isLeft = offset === -1;
                const isRight = offset === 1;
                const isFarLeft = offset === -2;
                const isFarRight = offset === 2;
                const isHidden = Math.abs(offset) > 2;

                let positionClass = 'hidden';
                if (isCenter) positionClass = 'center';
                else if (isLeft) positionClass = 'left-1';
                else if (isRight) positionClass = 'right-1';
                else if (isFarLeft) positionClass = 'left-2';
                else if (isFarRight) positionClass = 'right-2';

                return (
                  <div
                    key={item.id}
                    className={`tm-gallery-slide-card ${positionClass} ${isCenter ? 'active' : ''}`}
                    onClick={() => {
                      if (!isCenter) {
                        setActiveIndex(index);
                      } else if (onNavigate) {
                        onNavigate('gallery');
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.title} - Click to ${isCenter ? 'open full gallery' : 'view'}`}
                  >
                    <div className="tm-slide-card-inner">
                      <img
                        src={item.src}
                        alt={item.alt}
                        className="tm-slide-card-image"
                        loading={Math.abs(offset) <= 1 ? 'eager' : 'lazy'}
                      />
                      {item.isVideo && (
                        <div className="tm-slide-card-play-badge" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Round Arrow Controls */}
          <div className="tm-gallery-card-controls">
            <button
              type="button"
              className="tm-gallery-nav-arrow-btn"
              onClick={handlePrev}
              aria-label="Previous Image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="tm-gallery-nav-arrow-btn"
              onClick={handleNext}
              aria-label="Next Image"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeGallerySection;
