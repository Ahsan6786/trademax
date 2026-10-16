import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/landing/Navbar';
import { Hero } from './components/landing/Hero';
import { CoursesSection } from './components/landing/CoursesSection';
import { AuthOverlay } from './components/landing/AuthOverlay';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { CourseDetailsPage } from './components/courses/CourseDetailsPage';
import { CourseRegistrationModal } from './components/courses/CourseRegistrationModal';
import { AdminDashboardModal } from './components/admin/AdminDashboardModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { FounderPage } from './components/founder/FounderPage';
import { GalleryPage } from './components/gallery/GalleryPage';
import { HomeGallerySection } from './components/landing/HomeGallerySection';
import { StocksPage } from './components/stocks/StocksPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { Footer } from './components/common/Footer';
import { authService } from './services/auth';
import { applySystemUI, getTopBarColor } from './systemUI';

function App() {
  const authRef = useRef(null);

  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const hash = window.location.hash;
      const cached = authService.getCachedUser();

      // Direct URL check for dedicated course details page
      if (
        pathname === '/courses/trading-masterclass' ||
        pathname === '/courses/trading-masterclass/' ||
        hash === '#courses/trading-masterclass' ||
        hash === '#/courses/trading-masterclass' ||
        hash === '#course-trading-masterclass' ||
        hash === '#course-details'
      ) {
        return 'course-details';
      }

      // Direct URL check for dedicated Founder page
      if (
        pathname === '/founder' ||
        pathname === '/founder/' ||
        hash === '#founder' ||
        hash === '#/founder'
      ) {
        return 'founder';
      }

      // Direct URL check for dedicated Gallery page
      if (
        pathname === '/gallery' ||
        pathname === '/gallery/' ||
        hash === '#gallery' ||
        hash === '#/gallery'
      ) {
        return 'gallery';
      }

      if (hash === '#stocks' || hash === '#terminal' || hash === '#charts') {
        return 'stocks';
      }

      if (hash === '#settings') {
        return 'settings';
      }

      // Direct URL check for dedicated Student Dashboard / Portal
      if (
        pathname === '/student' ||
        pathname === '/student/' ||
        hash === '#student' ||
        hash === '#dashboard'
      ) {
        return cached ? 'dashboard' : 'landing';
      }

      if (cached?.role === 'admin' && (hash === '#admin' || hash === '')) {
        return 'admin';
      }
      if (hash === '#home' || hash === '#courses') {
        return 'landing';
      }
      if (cached) {
        return 'dashboard';
      }
    }
    return 'landing';
  });

  const [user, setUser] = useState(() => authService.getCachedUser());
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash === '#admin';
    }
    return false;
  });

  const [courseSettings, setCourseSettings] = useState({
    batchName: 'November',
    seatsAvailable: 15,
    showSeatCount: false,
    announcementText: 'November Batch — Limited Seats Available',
    contactPhone: '8799026206',
  });

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tm_theme') || localStorage.getItem('tm_course_theme') || 'dark';
    }
    return 'dark';
  });

  const toggleTheme = (nextTheme) => {
    const val = typeof nextTheme === 'string' ? nextTheme : (theme === 'dark' ? 'light' : 'dark');
    setTheme(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tm_theme', val);
      localStorage.setItem('tm_course_theme', val);
      document.documentElement.setAttribute('data-theme', val);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  // Keep the system status bar in sync with the active page / theme / auth overlay
  const [authOpen, setAuthOpen] = useState(false);
  useEffect(() => {
    const sync = () => setAuthOpen(document.body.classList.contains('auth-open'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    applySystemUI(getTopBarColor(currentView, theme, authOpen));
  }, [currentView, theme, authOpen]);

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Fetch courses from database and settings on mount or refresh
  const loadCoursesAndSettings = async () => {
    try {
      const [coursesRes, settingsRes] = await Promise.all([
        fetch('/api/courses').then((res) => res.json()).catch(() => ({ success: false })),
        fetch('/api/courses/settings').then((res) => res.json()).catch(() => ({ success: false })),
      ]);

      if (coursesRes.success && Array.isArray(coursesRes.courses)) {
        setCourses(coursesRes.courses);
      }
      if (settingsRes.success && settingsRes.settings) {
        setCourseSettings(settingsRes.settings);
      }
    } catch (err) {
      console.warn('Could not load courses/settings:', err);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    loadCoursesAndSettings();
  }, []);

  // Primary course featured across the platform
  const primaryCourse =
    courses.find((c) => c.slug === 'trading-masterclass') || courses[0] || null;

  // Backend session verification & Route Protection on mount
  useEffect(() => {
    let isMounted = true;
    authService.getMe().then((verifiedUser) => {
      if (!isMounted) return;
      if (verifiedUser) {
        setUser(verifiedUser);
        const pathname = window.location.pathname;
        const hash = window.location.hash;

        if (verifiedUser.role === 'admin' && (hash === '#admin' || hash === '')) {
          setCurrentView('admin');
          if (hash !== '#admin') {
            window.location.hash = '#admin';
          }
          return;
        }

        if (
          pathname === '/student' ||
          pathname === '/student/' ||
          hash === '#student' ||
          hash === '#dashboard'
        ) {
          setCurrentView('dashboard');
          if (hash !== '#dashboard') {
            window.location.hash = '#dashboard';
          }
          return;
        }

        // Direct authenticated student opening root / with no hash to dashboard
        if (hash === '' && (pathname === '/' || !pathname)) {
          setCurrentView('dashboard');
          window.location.hash = '#dashboard';
          return;
        }
      } else {
        setUser(null);
        const pathname = window.location.pathname;
        const hash = window.location.hash;
        if (
          hash === '#dashboard' ||
          hash === '#student' ||
          hash === '#admin' ||
          pathname === '/student' ||
          pathname === '/student/'
        ) {
          setCurrentView('landing');
          window.location.hash = '#home';
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync pathname, popstate, hash routing & protection
  useEffect(() => {
    const handleLocationSync = () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash;
      const currentUser = authService.getCachedUser();

      if (hash === '#admin') {
        if (currentUser?.role === 'admin') {
          setCurrentView('admin');
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          return;
        } else {
          setCurrentView('landing');
          window.location.hash = '#home';
          if (authRef.current) {
            authRef.current.openFrom(null, 'login');
          }
          return;
        }
      }

      if (
        pathname === '/founder' ||
        pathname === '/founder/' ||
        hash === '#founder' ||
        hash === '#/founder'
      ) {
        setCurrentView('founder');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      if (
        pathname === '/gallery' ||
        pathname === '/gallery/' ||
        hash === '#gallery' ||
        hash === '#/gallery'
      ) {
        setCurrentView('gallery');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      if (
        pathname === '/courses/trading-masterclass' ||
        pathname === '/courses/trading-masterclass/' ||
        hash === '#courses/trading-masterclass' ||
        hash === '#/courses/trading-masterclass' ||
        hash === '#course-trading-masterclass' ||
        hash === '#course-details'
      ) {
        setCurrentView('course-details');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      if (hash === '#stocks' || hash === '#terminal' || hash === '#charts') {
        setCurrentView('stocks');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      if (hash === '#settings') {
        setCurrentView('settings');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      if (
        pathname === '/student' ||
        pathname === '/student/' ||
        hash === '#student' ||
        hash === '#dashboard'
      ) {
        if (!currentUser) {
          setCurrentView('landing');
          window.location.hash = '#home';
          if (authRef.current) {
            authRef.current.openFrom(null, 'login');
          }
          return;
        }
        setCurrentView('dashboard');
        if (hash !== '#dashboard') {
          window.location.hash = '#dashboard';
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      if (hash === '#home') {
        setCurrentView('landing');
        return;
      }

      if (hash === '') {
        if (currentUser) {
          setCurrentView('dashboard');
          window.location.hash = '#dashboard';
          return;
        }
        setCurrentView('landing');
        return;
      }

      if (hash === '#courses') {
        setCurrentView('landing');
        setTimeout(() => {
          const el = document.getElementById('courses');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return;
      }
    };

    window.addEventListener('popstate', handleLocationSync);
    window.addEventListener('hashchange', handleLocationSync);
    return () => {
      window.removeEventListener('popstate', handleLocationSync);
      window.removeEventListener('hashchange', handleLocationSync);
    };
  }, []);

  const pendingCourseEnrollRef = useRef(false);

  const handleOpenAuth = (btn, mode = 'register') => {
    if (authRef.current) {
      authRef.current.openFrom(btn, mode);
    }
  };

  const handleRegisterForCourse = () => {
    const currentUser = user || authService.getCachedUser();
    if (!currentUser) {
      // User is logged out: open Sign In modal directly
      pendingCourseEnrollRef.current = true;
      if (authRef.current) {
        authRef.current.openFrom(null, 'login');
      }
      return;
    }

    // User is logged in: open enrollment modal directly
    setIsRegisterModalOpen(true);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    const shouldContinueEnroll = pendingCourseEnrollRef.current;
    pendingCourseEnrollRef.current = false;

    if (userData?.role === 'admin') {
      setCurrentView('admin');
      window.location.hash = '#admin';
    } else {
      setCurrentView('dashboard');
      window.location.hash = '#dashboard';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    if (shouldContinueEnroll) {
      setIsRegisterModalOpen(true);
    }
  };

  const handleOpenAdminPortal = () => {
    const currentUser = authService.getCachedUser();
    if (currentUser?.role === 'admin') {
      setCurrentView('admin');
      window.location.hash = '#admin';
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } else {
      if (authRef.current) {
        authRef.current.openFrom(null, 'login');
      }
    }
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    const shouldContinueEnroll = pendingCourseEnrollRef.current;
    pendingCourseEnrollRef.current = false;

    setCurrentView('dashboard');
    window.location.hash = '#dashboard';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    if (shouldContinueEnroll) {
      setIsRegisterModalOpen(true);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setCurrentView('landing');
    window.location.hash = '#home';
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleNavigate = (view) => {
    if (view === 'dashboard') {
      const currentUser = authService.getCachedUser();
      if (!currentUser) {
        if (authRef.current) {
          authRef.current.openFrom(null, 'login');
        }
        return;
      }
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
        window.location.hash = '#dashboard';
      }
      setCurrentView('dashboard');
    } else if (view === 'stocks' || view === 'charts' || view === 'terminal') {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
        window.location.hash = '#stocks';
      }
      setCurrentView('stocks');
    } else if (view === 'settings') {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
        window.location.hash = '#settings';
      }
      setCurrentView('settings');
    } else if (view === 'course-details') {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/courses/trading-masterclass');
      }
      setCurrentView('course-details');
    } else if (view === 'founder') {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/founder');
      }
      setCurrentView('founder');
    } else if (view === 'gallery') {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/gallery');
      }
      setCurrentView('gallery');
    } else if (view === 'courses') {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
        window.location.hash = '#courses';
      }
      setCurrentView('landing');
      setTimeout(() => {
        const el = document.getElementById('courses');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', '/');
        window.location.hash = '#home';
      }
      setCurrentView('landing');
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const handleNavigateBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        handleNavigate('landing');
      }
    }
  };

  const showBottomNav = Boolean(user) && currentView !== 'admin';

  return (
    <div className={`tm-app-root tm-theme-${theme} ${showBottomNav ? 'has-mobile-bottom-nav' : ''}`}>
      {currentView === 'admin' ? (
        <AdminPanel
          user={user}
          onLogout={handleLogout}
          onExitToSite={() => handleNavigate('landing')}
          theme={theme}
          onToggleTheme={toggleTheme}
          onCourseUpdated={loadCoursesAndSettings}
        />
      ) : currentView === 'stocks' ? (
        <StocksPage
          onBack={handleNavigateBack}
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : currentView === 'settings' ? (
        <SettingsPage
          user={user}
          onBack={handleNavigateBack}
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenAuth={(mode) => {
            if (authRef.current) authRef.current.openFrom(null, mode);
          }}
        />
      ) : currentView === 'dashboard' ? (
        <StudentDashboard
          user={user}
          course={primaryCourse}
          onOpenCourseDetails={() => handleNavigate('course-details')}
          onRegisterCourse={handleRegisterForCourse}
          onExit={() => handleNavigate('landing')}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : currentView === 'course-details' ? (
        <div className={`tm-cdp-page-wrapper tm-theme-${theme}`}>
          <Navbar
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
            user={user}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
            isHome={false}
            currentView="course-details"
            onBack={handleNavigateBack}
          />
          <CourseDetailsPage
            onBack={handleNavigateBack}
            onRegister={handleRegisterForCourse}
            course={primaryCourse}
            settings={courseSettings}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <Footer onNavigate={handleNavigate} theme={theme} />
          <AuthOverlay
            ref={authRef}
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
          />
        </div>
      ) : currentView === 'founder' ? (
        <div className={`tm-founder-page-wrapper tm-theme-${theme}`}>
          <Navbar
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
            user={user}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
            isHome={false}
            currentView="founder"
            onBack={handleNavigateBack}
          />
          <FounderPage
            onBack={handleNavigateBack}
            onNavigate={handleNavigate}
            theme={theme}
          />
          <Footer onNavigate={handleNavigate} theme={theme} />
          <AuthOverlay
            ref={authRef}
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
          />
        </div>
      ) : currentView === 'gallery' ? (
        <div className={`tm-gallery-page-wrapper tm-theme-${theme}`}>
          <Navbar
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
            user={user}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
            isHome={false}
            currentView="gallery"
            onBack={handleNavigateBack}
          />
          <GalleryPage
            onBack={handleNavigateBack}
            onNavigate={handleNavigate}
            theme={theme}
          />
          <Footer onNavigate={handleNavigate} theme={theme} />
          <AuthOverlay
            ref={authRef}
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
          />
        </div>
      ) : (
        <>
          <Navbar
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
            user={user}
            onLogout={handleLogout}
            theme={theme}
            onToggleTheme={toggleTheme}
            isHome={true}
            currentView="landing"
          />
          <Hero
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
            theme={theme}
          />
          <CoursesSection
            onOpenDetails={() => handleNavigate('course-details')}
            onRegister={handleRegisterForCourse}
            course={primaryCourse}
            settings={courseSettings}
            theme={theme}
          />
          {/* Life Behind TRADEMAX — Homepage Gallery Section */}
          <HomeGallerySection
            onNavigate={handleNavigate}
            theme={theme}
          />
          <AuthOverlay
            ref={authRef}
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
          />
          {/* Redesigned Institutional Footer */}
          <Footer onNavigate={handleNavigate} theme={theme} />
        </>
      )}

      {/* Smart Course Registration & Enrollment Modal */}
      <CourseRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        batchName={primaryCourse?.batch_name || courseSettings.batchName}
        courseId={primaryCourse?.id}
        user={user}
        onNavigate={handleNavigate}
      />

      {/* Mobile Sticky Bottom Navigation — Displayed ONLY when user is authenticated/logged in */}
      {showBottomNav && (
        <MobileBottomNav
          currentView={currentView}
          onNavigate={handleNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}

export default App;
