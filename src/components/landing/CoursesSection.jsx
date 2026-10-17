import React, { useState } from 'react';
import { CourseCard } from '../courses/CourseCard';
import { CourseDetailsModal } from '../courses/CourseDetailsModal';
import { VillaEnquiryModal } from '../courses/VillaEnquiryModal';
import './CoursesSection.css';

const DEFAULT_COURSES = [
  {
    id: 1,
    slug: 'trading-masterclass',
    title: 'Basics to Advanced Course',
    subtitle: 'Forex & Crypto Trading Masterclass',
    description:
      'A comprehensive foundation to advanced curriculum covering market structure, technical analysis, trading psychology, and disciplined risk management across Forex and Crypto markets.',
    thumbnail: '/1-c.jpeg',
    price: 20000,
    original_price: 25000,
    discount_label: 'Save ₹5,000 (20% OFF)',
    duration: '30 Days',
    level: 'Basic to Advanced',
    learning_mode: 'Live Online',
    topics: [
      'Forex & Crypto Institutional Trading',
      'Technical Analysis & Market Structure',
      'Trading Psychology & Discipline',
      'Risk Management & Trade Planning',
      'Strategy Development',
      'Backtesting & Forward Testing',
      'Live Market Analysis for Educational Practice',
      'Trade Execution & Management',
      'TradingView & Chart Analysis',
      'Common Trading Mistakes and How to Avoid Them',
    ],
    learning_outcomes:
      'Develop a structured, disciplined trading foundation with clear risk controls and institutional price action understanding.',
    is_enquiry_only: false,
  },
  {
    id: 2,
    slug: 'professional-technical-analysis',
    title: 'Professional Technical Analysis',
    subtitle: 'Structured Technical Analysis & Price Action',
    description:
      'Learn to analyze financial markets using structured technical analysis.',
    thumbnail: '/7999.jpeg',
    price: 7999,
    original_price: 9999,
    discount_label: 'Save ₹2,000 (20% OFF)',
    duration: '7 Days',
    level: 'Intermediate to Advanced',
    learning_mode: 'Live Online',
    topics: [
      'Market Structure & Trends',
      'Support and Resistance',
      'Supply and Demand Zones',
      'Candlestick Patterns',
      'Price Action',
      'Trendlines',
      'Breakouts',
      'Liquidity Concepts',
      'Market Structure Shifts',
      'Multi-Timeframe Analysis',
      'Practical Chart Analysis',
    ],
    learning_outcomes:
      'Develop a structured approach to reading charts and identifying potential trading opportunities.',
    is_enquiry_only: false,
  },
  {
    id: 3,
    slug: 'trading-psychology-development',
    title: 'Trading Psychology Development',
    subtitle: 'Discipline, Emotional Control & Mindset',
    description:
      'Develop the discipline and emotional control required for consistent execution of a trading plan.',
    thumbnail: '/training-6999.jpeg',
    price: 6999,
    original_price: 8999,
    discount_label: 'Save ₹2,000 (22% OFF)',
    duration: '5 Days',
    level: 'All Experience Levels',
    learning_mode: 'Live Online',
    topics: [
      'Trading Mindset',
      'Fear and Greed',
      'FOMO',
      'Revenge Trading',
      'Overtrading',
      'Managing Losses',
      'Patience',
      'Emotional Control',
      'Trading Journals',
      'Performance Reviews',
    ],
    learning_outcomes:
      'Build better trading habits and learn to follow predefined trading rules.',
    is_enquiry_only: false,
  },
  {
    id: 4,
    slug: 'professional-risk-management',
    title: 'Professional Risk Management',
    subtitle: 'Capital Preservation & Exposure Control',
    description:
      'Learn to manage trading exposure and protect capital through structured risk management.',
    thumbnail: '/professional-6999.jpeg',
    price: 6999,
    original_price: 8999,
    discount_label: 'Save ₹2,000 (22% OFF)',
    duration: '5 Days',
    level: 'All Experience Levels',
    learning_mode: 'Live Online',
    topics: [
      'Capital Preservation',
      'Risk-per-Trade Calculations',
      'Position Sizing',
      'Lot-Size Calculations',
      'Leverage',
      'Exposure',
      'Stop-Loss Placement',
      'Risk-to-Reward Ratios',
      'Drawdown',
      'Daily Loss Limits',
      'Personal Risk-Management Planning',
    ],
    learning_outcomes:
      'Learn to calculate trade risk, control exposure, and develop a structured risk-management plan.',
    is_enquiry_only: false,
  },
  {
    id: 5,
    slug: 'advanced-professional-strategy-development',
    title: 'Advanced Professional Strategy Development',
    subtitle: 'Rule-Based Strategy Refinement & Testing',
    description:
      'An advanced program for experienced traders who want to develop, test, and refine their own rule-based trading strategies.',
    thumbnail: '/14999.jpeg',
    price: 14999,
    original_price: 18999,
    discount_label: 'Save ₹4,000 (21% OFF)',
    duration: '14 Days',
    level: 'Advanced & Experienced Traders',
    learning_mode: 'Live Online',
    topics: [
      'Strategy Frameworks',
      'Market Selection',
      'Market Structure',
      'Liquidity Concepts',
      'Entry and Exit Models',
      'Higher-Timeframe Bias',
      'Lower-Timeframe Execution',
      'Stop-Loss and Target Rules',
      'Historical Backtesting',
      'Forward Testing',
      'Trade Journaling',
      'Win Rate',
      'Expectancy',
      'Drawdown Analysis',
      'Strategy Refinement',
      'Final Assessment',
    ],
    learning_outcomes:
      'Develop a documented trading strategy with predefined rules, measurable performance criteria, and a structured improvement plan.',
    is_enquiry_only: false,
  },
  {
    id: 6,
    slug: 'villa-trading-experience',
    title: 'Villa Trading Experience',
    subtitle: 'Exclusive In-Person Trading Immersion',
    description:
      'An exclusive villa-based trading experience intended for professional and experienced traders.',
    thumbnail: '/villa.png',
    price: 0,
    duration: 'Enquiry Based',
    level: 'Professional Traders',
    learning_mode: 'In-Person Immersion',
    topics: [
      'Program Format and Schedule',
      'Eligibility Requirements',
      'Practical Trading Activities',
      'Group Size',
      'Participation Details',
      'Pricing',
      'Availability',
    ],
    learning_outcomes:
      'Immersive in-person trading environment with live desk routines, real-time market execution, and peer collaborative reviews.',
    is_enquiry_only: true,
  },
];

const LEARNING_EXPERIENCE_ITEMS = [
  {
    bentoClass: 'tm-bento-hero tm-bento-c1',
    tag: 'Step-by-Step',
    title: 'Structured Online Training',
    desc: 'Clear, step-by-step lessons designed to help you build trading discipline and understand the market easily.',
    badge: 'Easy to Follow',
  },
  {
    bentoClass: 'tm-bento-tall tm-bento-c2',
    tag: 'Real Charts',
    title: 'Practical Chart-Based Examples',
    desc: 'Study real live market charts showing supply, demand, and how major market moves happen.',
    badge: 'Live Market Practice',
  },
  {
    bentoClass: 'tm-bento-compact-1 tm-bento-c3',
    tag: 'Hands-On Work',
    title: 'Assignments and Case Studies',
    desc: 'Practice what you learn with hands-on chart exercises and real trade breakdown examples.',
    badge: 'Practical Exercises',
  },
  {
    bentoClass: 'tm-bento-compact-2 tm-bento-c4',
    tag: 'Trading Journal',
    title: 'Daily Trade Logbook',
    desc: 'Learn to record your trades, manage your emotions, track your results, and learn from mistakes.',
    badge: 'Track Every Trade',
  },
  {
    bentoClass: 'tm-bento-wide tm-bento-c5',
    tag: 'Rule Testing',
    title: 'Strategy Testing and Evaluation',
    desc: 'Test your strategy rules on past and live market data to see what works before risking real money.',
    badge: 'Tested with Real Data',
  },
  {
    bentoClass: 'tm-bento-accent tm-bento-c6',
    tag: 'Final Review',
    title: 'Final Assessments',
    desc: 'Complete practical tests to make sure you follow your risk rules and trade with confidence.',
    badge: 'Rule-Based Trading',
  },
];

export const CoursesSection = ({
  onOpenDetails,
  onRegister,
  courses = [],
  settings,
  user,
  theme,
}) => {
  // Merge live courses from database with default metadata fallbacks
  const displayCourses = React.useMemo(() => {
    if (!courses || courses.length === 0) {
      return DEFAULT_COURSES;
    }

    // Map each default course to its corresponding DB record if present
    const bySlug = new Map(courses.map((c) => [c.slug, c]));

    const merged = DEFAULT_COURSES.map((def) => {
      const dbMatch = bySlug.get(def.slug);
      if (!dbMatch) return def;
      return {
        ...def,
        ...dbMatch,
        price: dbMatch.price !== undefined ? parseFloat(dbMatch.price) : def.price,
        original_price:
          dbMatch.original_price !== undefined
            ? parseFloat(dbMatch.original_price)
            : def.original_price,
        topics: dbMatch.topics || def.topics,
        learning_outcomes: dbMatch.learning_outcomes || def.learning_outcomes,
      };
    });

    // Also include any other published courses from DB not in defaults
    courses.forEach((c) => {
      if (!DEFAULT_COURSES.some((def) => def.slug === c.slug) && c.is_published) {
        merged.push(c);
      }
    });

    return merged;
  }, [courses]);

  // Modal states
  const [selectedDetailsCourse, setSelectedDetailsCourse] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [selectedEnquiryCourse, setSelectedEnquiryCourse] = useState(null);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);

  const handleOpenCourseDetails = (course) => {
    if (onOpenDetails) {
      onOpenDetails(course);
      return;
    }
    setSelectedDetailsCourse(course);
    setIsDetailsModalOpen(true);
  };

  const handleOpenCourseEnquiry = (course) => {
    setSelectedEnquiryCourse(course);
    setIsEnquiryModalOpen(true);
  };

  const handleRegisterCourse = (course) => {
    if (onRegister) {
      onRegister(course);
    }
  };

  return (
    <section id="courses" className="tm-courses-section" aria-label="TRADEMAX Courses">
      <div className="tm-courses-container">
        {/* Section Header */}
        <div className="tm-courses-header">
          <h2 className="tm-courses-title">
            Trading Education Programs
          </h2>
          <p className="tm-courses-subtitle">
            Structured technical analysis, discipline engineering, capital preservation, and institutional strategy development.
          </p>
        </div>

        {/* 6-Card Grid: 5 Courses + Villa Trading Experience */}
        <div className="tm-courses-catalog-grid">
          {displayCourses.map((course) => (
            <CourseCard
              key={course.id || course.slug}
              course={course}
              onOpenDetails={handleOpenCourseDetails}
              onRegister={handleRegisterCourse}
              onEnquire={handleOpenCourseEnquiry}
              settings={settings}
              theme={theme}
            />
          ))}
        </div>

        {/* Learning Experience Section — Asymmetrical Bento Grid */}
        <section className="tm-courses-experience-wrap" aria-labelledby="tm-experience-title">
          <div className="tm-exp-header">
            <h3 id="tm-experience-title" className="tm-exp-title">Learning Experience</h3>
            <p className="tm-exp-subtitle">
              Practical, easy-to-follow lessons to help you read charts, manage risk, and trade with confidence.
            </p>
          </div>

          <div className="tm-bento-grid">
            {LEARNING_EXPERIENCE_ITEMS.map((item, idx) => (
              <div key={idx} className={`tm-bento-card ${item.bentoClass}`}>
                {/* Subtle Physical Grain Texture */}
                <div className="tm-bento-grain" aria-hidden="true" />

                {/* Foreground Card Content — Headings, Descriptions, Supporting Text Only */}
                <div className="tm-bento-inner">
                  <div className="tm-bento-card-top">
                    <span className="tm-bento-tag">{item.tag}</span>
                  </div>
                  <div className="tm-bento-card-content">
                    <h4 className="tm-bento-title">{item.title}</h4>
                    <p className="tm-bento-desc">{item.desc}</p>
                  </div>
                  <div className="tm-bento-card-footer">
                    <span className="tm-bento-badge">{item.badge}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Financial Risk Disclaimer */}
        <div className="tm-courses-disclaimer-box" role="note" aria-label="Financial Risk Disclaimer">
          <p className="tm-disclaimer-text">
            “Course durations are proposed recommendations and may be adjusted to match the actual curriculum and teaching format. Trading involves financial risk. These courses do not guarantee profits or trading success.”
          </p>
        </div>
      </div>

      {/* Course Details Modal */}
      <CourseDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        course={selectedDetailsCourse}
        onRegister={handleRegisterCourse}
        onEnquire={handleOpenCourseEnquiry}
        theme={theme}
      />

      {/* Villa Trading Experience Enquiry Modal */}
      <VillaEnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        user={user}
        course={selectedEnquiryCourse}
        theme={theme}
      />
    </section>
  );
};

export default CoursesSection;
