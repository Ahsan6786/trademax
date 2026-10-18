import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SUPPORTED_LANGUAGES, getTranslation } from '../../i18n/translations';
import { CourseRegistrationModal } from '../courses/CourseRegistrationModal';
import { CourseClassroom } from './CourseClassroom';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpenCheck,
  Video,
  Bell,
  CreditCard,
  Settings,
  Sun,
  Moon,
  ExternalLink,
  LogOut,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldCheck,
  X,
  Lock,
  RefreshCw,
  LifeBuoy,
} from 'lucide-react';
import { StudentTickets } from './StudentTickets';
import './StudentDashboard.css';

export const StudentDashboard = ({
  user,
  course: primaryCourse,
  initialTab = 'dashboard',
  onTabChange,
  onOpenCourseDetails,
  onLogout,
  onExit,
  onNavigate,
  theme = 'dark',
  onToggleTheme,
}) => {
  // Navigation tabs: dashboard | my-courses | courses | live-classes | announcements
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);
  const mainContentRef = useRef(null);

  // Synchronize activeTab when parent changes initialTab (e.g. mobile bottom bar clicks)
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      if (initialTab === 'settings') {
        if (onNavigate) onNavigate('settings');
      } else {
        setActiveTab(initialTab);
        setActiveCourseClassroom(null);
      }
    }
  }, [initialTab, onNavigate]);

  const handleTabSwitch = (tab) => {
    setActiveCourseClassroom(null);
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
    setIsMobileDrawerOpen(false);
  };

  // Close mobile language dropdown when clicking or touching outside
  useEffect(() => {
    if (!isLangDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isLangDropdownOpen]);

  // Language management
  const [currentLang, setCurrentLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tm_portal_lang') || 'en';
    }
    return 'en';
  });

  const t = getTranslation(currentLang);

  const handleLanguageChange = (langCode) => {
    setCurrentLang(langCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tm_portal_lang', langCode);
    }
  };

  // Student Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [coursesList, setCoursesList] = useState([]);
  const [myCoursesList, setMyCoursesList] = useState([]);
  const [liveClassesList, setLiveClassesList] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [activeCourseClassroom, setActiveCourseClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  // Settings form states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    trading_experience: user?.trading_experience || 'Intermediate',
  });

  // 1-click enroll loading state
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);

  // Scroll to top on tab switch
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Fetch Dashboard & Portal Data from PostgreSQL Backend
  const fetchPortalData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
      }
      const [dashRes, coursesRes, liveRes, announceRes, myCoursesRes] = await Promise.all([
        fetch('/api/student/dashboard', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/student/courses', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/student/live-classes', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/student/announcements', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/student/my-courses', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (dashRes.success && dashRes.data) {
        setDashboardData(dashRes.data);
        if (dashRes.data.profile) {
          setProfileForm({
            name: dashRes.data.profile.name || '',
            mobile: dashRes.data.profile.mobile || '',
            trading_experience: dashRes.data.profile.trading_experience || 'Intermediate',
          });
        }
      }

      if (coursesRes.success && Array.isArray(coursesRes.courses)) {
        setCoursesList(coursesRes.courses);
      }

      if (myCoursesRes.success && Array.isArray(myCoursesRes.courses)) {
        setMyCoursesList(myCoursesRes.courses);
      }

      if (liveRes.success && Array.isArray(liveRes.liveClasses)) {
        setLiveClassesList(liveRes.liveClasses);
      }

      if (announceRes.success && Array.isArray(announceRes.announcements)) {
        setAnnouncementsList(announceRes.announcements);
      }
    } catch (err) {
      console.warn('Error fetching student portal data:', err);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchPortalData();

    const handleCustomEnroll = () => {
      fetchPortalData();
    };
    window.addEventListener('tm:enrollment_updated', handleCustomEnroll);
    return () => {
      window.removeEventListener('tm:enrollment_updated', handleCustomEnroll);
    };
  }, [fetchPortalData]);

  // Toast Notification Helper
  const showToast = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 4500);
  };

  // State for Manual QR Payment Modal and Student Claims
  const [enrollModalCourse, setEnrollModalCourse] = useState(null);
  const [studentClaims, setStudentClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [previewScreenshotClaim, setPreviewScreenshotClaim] = useState(null);

  // Fetch Student Manual Payment Claims History (IDOR protected)
  const fetchStudentClaims = useCallback(async () => {
    try {
      setClaimsLoading(true);
      const token = localStorage.getItem('tm_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/student/payment-claims', { headers, credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.claims)) {
        setStudentClaims(data.claims);
      }
    } catch (err) {
      console.warn('Could not fetch student payment claims:', err);
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentClaims();
  }, [fetchStudentClaims, activeTab]);

  // Open manual QR payment checkout modal
  const handleEnrollCourse = (courseToEnroll) => {
    setEnrollModalCourse(courseToEnroll);
  };




  // Safe student identifiers
  const displayName = profileForm.name || user?.name || dashboardData?.profile?.name || 'Student';
  const userEmail = user?.email || dashboardData?.profile?.email || 'student@trademaxclub.in';

  // Compute initials for reference-styled avatar
  const getInitials = (nameStr) => {
    if (!nameStr) return 'ST';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameStr.slice(0, 2).toUpperCase();
  };

  const enrolledCourses = dashboardData?.enrolledCourses || [];
  // Use real database data only without fake fallbacks
  const upcomingClasses = dashboardData?.upcomingClasses || liveClassesList;
  const announcements = dashboardData?.announcements || announcementsList;
  const stats = dashboardData?.stats || {
    totalEnrolled: enrolledCourses.length,
    upcomingSessionsCount: upcomingClasses.length,
    averageProgress:
      enrolledCourses.length > 0
        ? Math.round(enrolledCourses.reduce((acc, c) => acc + (c.progress_percentage || 0), 0) / enrolledCourses.length)
        : 0,
  };

  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, group: 'MAIN' },
    { id: 'my-courses', label: t.nav.myCourses || 'My Courses', group: 'LEARNING' },
    { id: 'courses', label: t.nav.courses || 'All Courses', group: 'LEARNING' },
    { id: 'payments', label: 'My Payments', group: 'ACCOUNT' },
    { id: 'announcements', label: t.nav.announcements, group: 'LEARNING' },
  ];

  const currentTabLabel = navItems.find((n) => n.id === activeTab)?.label || t.nav.dashboard;

  return (
    <div className={`tm-portal-layout tm-theme-${theme}`}>
      {/* Mobile Slide-out Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="tm-portal-drawer-backdrop"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ------------------------------------------------------------------
          1. PROFESSIONAL SIDEBAR (Admin Panel Layout & Styling)
          ------------------------------------------------------------------ */}
      <aside className={`tm-portal-sidebar ${isMobileDrawerOpen ? 'is-drawer-open' : ''}`}>
        <div className="tm-portal-sidebar-header">
          <div className="tm-portal-brand" onClick={() => handleTabSwitch('dashboard')}>
            <span className="tm-portal-logo-text">TRADE<span className="tm-red">MAX</span></span>
          </div>
          <button
            type="button"
            className="tm-portal-close-sidebar-btn"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="tm-portal-nav" aria-label="Student Navigation">
          <button
            type="button"
            className={`tm-portal-nav-item ${activeTab === 'dashboard' && !activeCourseClassroom ? 'active' : ''}`}
            onClick={() => handleTabSwitch('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>{t.nav.dashboard}</span>
          </button>

          <button
            type="button"
            className={`tm-portal-nav-item ${activeTab === 'my-courses' && !activeCourseClassroom ? 'active' : ''}`}
            onClick={() => handleTabSwitch('my-courses')}
          >
            <BookOpenCheck size={18} />
            <span>{t.nav.myCourses || 'My Courses'}</span>
          </button>

          <button
            type="button"
            className={`tm-portal-nav-item ${activeTab === 'courses' && !activeCourseClassroom ? 'active' : ''}`}
            onClick={() => handleTabSwitch('courses')}
          >
            <GraduationCap size={18} />
            <span>{t.nav.courses || 'Available Courses'}</span>
          </button>

          <button
            type="button"
            className={`tm-portal-nav-item ${activeTab === 'live-classes' && !activeCourseClassroom ? 'active' : ''}`}
            onClick={() => handleTabSwitch('live-classes')}
          >
            <Video size={18} />
            <span>{t.liveClasses?.title || 'Live Classes'}</span>
          </button>

          <button
            type="button"
            className={`tm-portal-nav-item ${activeTab === 'announcements' && !activeCourseClassroom ? 'active' : ''}`}
            onClick={() => handleTabSwitch('announcements')}
          >
            <Bell size={18} />
            <span>{t.nav.announcements}</span>
          </button>

          <button
            type="button"
            className={`tm-portal-nav-item ${activeTab === 'payments' && !activeCourseClassroom ? 'active' : ''}`}
            onClick={() => handleTabSwitch('payments')}
          >
            <CreditCard size={18} />
            <span>My Payments</span>
          </button>

          <button
            type="button"
            className={`tm-portal-nav-item ${activeTab === 'support' && !activeCourseClassroom ? 'active' : ''}`}
            onClick={() => handleTabSwitch('support')}
          >
            <LifeBuoy size={18} />
            <span>Support Tickets</span>
          </button>

          <button
            type="button"
            className={`tm-portal-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              if (onNavigate) {
                onNavigate('settings');
              } else {
                window.location.hash = '#settings';
              }
              setIsMobileDrawerOpen(false);
            }}
          >
            <Settings size={18} />
            <span>{t.nav.settings}</span>
          </button>
        </nav>

        <div className="tm-portal-sidebar-footer">
          {/* Day / Night Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              className="tm-portal-sidebar-theme-btn"
              onClick={onToggleTheme}
              title="Toggle color theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Day Mode' : 'Night Mode'}</span>
            </button>
          )}

          {/* Quick Return to Public Site */}
          <button
            type="button"
            className="tm-portal-sidebar-exit-btn"
            onClick={onExit || (() => { window.location.href = '/'; })}
            title="View live website"
          >
            <ExternalLink size={16} />
            <span>View Public Site</span>
          </button>

          {/* Student User Info & Logout */}
          <div className="tm-portal-user-card">
            <div className="tm-portal-avatar">
              <User size={16} />
            </div>
            <div className="tm-portal-user-meta">
              <span className="tm-portal-user-name">{displayName}</span>
              <span className="tm-portal-user-role">Student</span>
            </div>
            <button
              type="button"
              className="tm-portal-logout-btn"
              onClick={onLogout}
              title={t.nav.logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------------
          2. MAIN CONTENT AREA & TOPBAR
          ------------------------------------------------------------------ */}
      <div className="tm-portal-main-wrapper">
        {/* Top Navbar Header (Solid Red, Height 58px, Exactly matching Admin Panel) */}
        <header className="tm-portal-topbar">
          <div className="tm-portal-topbar-left">
            <button
              type="button"
              className="tm-portal-menu-toggle"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Open menu"
            >
              <span className="bar"></span>
              <span className="bar"></span>
              <span className="bar"></span>
            </button>
          </div>

          <div className="tm-portal-topbar-right">
            {/* Desktop 4-Language Selector */}
            <div className="tm-portal-lang-selector tm-desktop-lang-selector">
              <div className="tm-portal-lang-pills">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`tm-lang-btn ${currentLang === lang.code ? 'is-active' : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                    title={lang.label}
                  >
                    {lang.short}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Compact Language Dropdown */}
            <div className="tm-portal-mobile-lang-dropdown" ref={langDropdownRef}>
              <button
                type="button"
                className={`tm-mobile-lang-trigger ${isLangDropdownOpen ? 'is-open' : ''}`}
                onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                aria-expanded={isLangDropdownOpen}
                aria-label="Select Language"
              >
                <span className="tm-mobile-lang-current">
                  {currentLang === 'en' ? 'EN' : currentLang === 'hi' ? 'हिंदी' : currentLang === 'mr' ? 'मराठी' : 'ગુજરાતી'}
                </span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`tm-mobile-lang-caret ${isLangDropdownOpen ? 'is-rotated' : ''}`}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {isLangDropdownOpen && (
                <div className="tm-mobile-lang-menu" role="menu">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = currentLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        className={`tm-mobile-lang-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          handleLanguageChange(lang.code);
                          setIsLangDropdownOpen(false);
                        }}
                        role="menuitem"
                      >
                        <span className="tm-mobile-lang-item-short">{lang.short}</span>
                        <span className="tm-mobile-lang-item-label">{lang.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Topbar Day/Night Theme Toggle (Identical to Admin Panel) */}
            {onToggleTheme && (
              <button
                type="button"
                className="tm-portal-topbar-theme-btn"
                onClick={onToggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Day' : 'Night'} Mode`}
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun size={15} className="tm-portal-theme-icon" />
                    <span className="tm-portal-theme-label">Day Mode</span>
                  </>
                ) : (
                  <>
                    <Moon size={15} className="tm-portal-theme-icon" />
                    <span className="tm-portal-theme-label">Night Mode</span>
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Global Status Message Toast */}
        {actionMessage && (
          <div className={`tm-portal-toast tm-toast-${actionMessage.type}`} role="alert">
            <span className="tm-toast-badge">
              {actionMessage.type === 'success' ? `[ ${t.common.success.toUpperCase()} ]` : `[ ${t.common.error.toUpperCase()} ]`}
            </span>
            <span className="tm-toast-text">{actionMessage.text}</span>
            <button
              type="button"
              className="tm-toast-close"
              onClick={() => setActionMessage(null)}
            >
              {t.common.close}
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------
            3. MAIN CONTENT VIEWS
            ------------------------------------------------------------------ */}
        <main ref={mainContentRef} className="tm-portal-main">
          {activeCourseClassroom ? (
            <CourseClassroom
              courseId={activeCourseClassroom}
              user={user}
              theme={theme}
              onBack={() => {
                setActiveCourseClassroom(null);
                fetchPortalData(true);
              }}
            />
          ) : loading && !dashboardData ? (
            <div className="tm-portal-loading-card">
              <div className="tm-loading-text">{t.common.loading}</div>
            </div>
          ) : (
            <>
              {/* ==============================================================
                  TAB 1: DASHBOARD OVERVIEW
                  ============================================================== */}
              {activeTab === 'dashboard' && (
                <div className="tm-tab-pane tm-dashboard-view">

                  {/* 3 Metric Cards */}
                  <div className="tm-stats-grid">
                    <div className="tm-stat-card">
                      <div className="tm-stat-top">
                        <span className="tm-stat-label">{t.dashboard.statEnrolled}</span>
                      </div>
                      <div className="tm-stat-bottom">
                        <span className="tm-stat-value">{stats.totalEnrolled}</span>
                        <span className="tm-stat-sub">Active institutional cohorts</span>
                      </div>
                    </div>

                    <div className="tm-stat-card tm-stat-card-progress">
                      <div className="tm-stat-top">
                        <span className="tm-stat-label">{t.dashboard.statProgress}</span>
                      </div>
                      <div className="tm-stat-bottom">
                        <span className="tm-stat-value">{stats.averageProgress}%</span>
                        <div
                          className="tm-stat-progressbar"
                          role="progressbar"
                          aria-valuenow={stats.averageProgress}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          <div
                            className="tm-stat-progressbar-fill"
                            style={{ width: `${Math.min(100, Math.max(0, stats.averageProgress))}%` }}
                          />
                        </div>
                        <span className="tm-stat-sub">Overall curriculum completion</span>
                      </div>
                    </div>

                    <div className="tm-stat-card">
                      <div className="tm-stat-top">
                        <span className="tm-stat-label">{t.dashboard.statUpcoming}</span>
                      </div>
                      <div className="tm-stat-bottom">
                        <span className="tm-stat-value">{stats.upcomingSessionsCount}</span>
                        <span className="tm-stat-sub">Scheduled live classes</span>
                      </div>
                    </div>
                  </div>

                  {/* Enrolled Courses Section */}
                  <section className="tm-portal-section">
                    <div className="tm-section-header-row">
                      <div>
                        <h2 className="tm-section-title">{t.dashboard.myCourses}</h2>
                        <span className="tm-section-sub">
                          Your active enrolled trading education programs
                        </span>
                      </div>
                      <button
                        type="button"
                        className="tm-section-link-btn"
                        onClick={() => setActiveTab('courses')}
                      >
                        {t.dashboard.viewAll} &rarr;
                      </button>
                    </div>

                    {dashboardData?.pendingCourses?.length > 0 && (
                      <div className="tm-dashboard-pending-banner">
                        <div className="tm-pending-banner-left">
                          <Clock size={20} className="tm-banner-clock" />
                          <div className="tm-banner-text-block">
                            <strong className="tm-banner-course-title">
                              {dashboardData.pendingCourses[0].course_title} — Payment In Process
                            </strong>
                            <p className="tm-banner-note-text">
                              Your payment is in process. Your course access will be activated after admin verification.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="tm-btn-banner-action"
                          onClick={() => setActiveTab('my-courses')}
                        >
                          View Status in My Courses &rarr;
                        </button>
                      </div>
                    )}

                    {enrolledCourses.length === 0 ? (
                      /* Clean Empty State */
                      <div className="tm-empty-state-card">
                        <span className="tm-empty-state-tag">[ NO ENROLLMENT RECORD ]</span>
                        <h3 className="tm-empty-state-title">{t.dashboard.noCoursesTitle}</h3>
                        <p className="tm-empty-state-desc">{t.dashboard.noCoursesDesc}</p>
                        <button
                          type="button"
                          className="tm-btn-solid-primary"
                          onClick={() => setActiveTab('courses')}
                        >
                          {t.common.exploreCourses}
                        </button>
                      </div>
                    ) : (
                      <div className="tm-enrolled-grid">
                        {enrolledCourses.map((item) => (
                          <div key={item.enrollment_id} className="tm-enrolled-card">
                            <div className="tm-enrolled-thumb-wrap">
                              <img
                                src={item.thumbnail || '/1-c.jpeg'}
                                alt={item.course_title}
                                className="tm-enrolled-thumb"
                                onError={(e) => {
                                  e.target.src = '/1-c.jpeg';
                                }}
                              />
                              <span className="tm-enrolled-badge">[ ENROLLED ]</span>
                            </div>

                            <div className="tm-enrolled-body">
                              <span className="tm-enrolled-batch">
                                {item.batch_name || 'November'} Batch · {item.learning_mode}
                              </span>
                              <h3 className="tm-enrolled-title">{item.course_title}</h3>
                              <p className="tm-enrolled-subtitle">{item.course_subtitle}</p>

                              <div className="tm-enrolled-actions">
                                <button
                                  type="button"
                                  className="tm-btn-solid-primary tm-btn-view-course"
                                  onClick={() => setActiveCourseClassroom(item.course_id || item.id)}
                                >
                                  View Course &rarr;
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Split Section: Upcoming Live Class & Recent Announcements (Clean Real Data / Empty States) */}
                  <div className="tm-dashboard-split-row">
                    {/* Upcoming Live Classes Panel */}
                    <div className="tm-split-panel">
                      <div className="tm-panel-header">
                        <h3 className="tm-panel-title">{t.dashboard.nextClass}</h3>
                        <button
                          type="button"
                          className="tm-panel-action"
                          onClick={() => setActiveTab('live-classes')}
                        >
                          {t.dashboard.viewAll}
                        </button>
                      </div>

                      {upcomingClasses.length === 0 ? (
                        <div className="tm-panel-empty-state">
                          <span className="tm-empty-hint">[ NO SCHEDULED SESSIONS ]</span>
                          <p className="tm-panel-empty-text">{t.dashboard.noUpcomingClasses}</p>
                          <span className="tm-panel-empty-sub">
                            Live schedules and meeting links will appear here as soon as scheduled by the desk.
                          </span>
                        </div>
                      ) : (
                        <div className="tm-panel-list">
                          {upcomingClasses.slice(0, 2).map((session) => (
                            <div key={session.id} className="tm-mini-session-card">
                              <div className="tm-mini-session-meta">
                                <span className="tm-mini-badge">[ LIVE ]</span>
                                <span className="tm-mini-time">
                                  {new Date(session.scheduled_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <h4 className="tm-mini-session-title">{session.title}</h4>
                              <span className="tm-mini-session-sub">
                                Instructor: {session.instructor} · {session.duration_minutes} {t.liveClasses.minutesUnit}
                              </span>
                              {session.meeting_link && (
                                <a
                                  href={session.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="tm-btn-mini-join"
                                >
                                  {t.dashboard.joinSession} &rarr;
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Announcements Panel */}
                    <div className="tm-split-panel">
                      <div className="tm-panel-header">
                        <h3 className="tm-panel-title">{t.dashboard.recentAnnouncements}</h3>
                        <button
                          type="button"
                          className="tm-panel-action"
                          onClick={() => setActiveTab('announcements')}
                        >
                          {t.dashboard.viewAll}
                        </button>
                      </div>

                      {announcements.length === 0 ? (
                        <div className="tm-panel-empty-state">
                          <span className="tm-empty-hint">[ NO ANNOUNCEMENTS ]</span>
                          <p className="tm-panel-empty-text">{t.dashboard.noAnnouncements}</p>
                          <span className="tm-panel-empty-sub">
                            Official notices and schedule updates will be published here.
                          </span>
                        </div>
                      ) : (
                        <div className="tm-panel-list">
                          {announcements.slice(0, 2).map((item) => (
                            <div key={item.id} className="tm-mini-notice-card">
                              <div className="tm-mini-notice-meta">
                                <span className="tm-mini-notice-category">[{item.category.toUpperCase()}]</span>
                                <span className="tm-mini-time">
                                  {new Date(item.published_date || item.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                              <h4 className="tm-mini-notice-title">{item.title}</h4>
                              <p className="tm-mini-notice-excerpt">{item.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ==============================================================
                  TAB 2: DEDICATED "MY COURSES" PAGE (Only Enrolled & Verified Courses)
                  ============================================================== */}
              {activeTab === 'my-courses' && (
                <div className="tm-tab-pane tm-mycourses-view">
                  <div className="tm-pane-header">
                    <h1 className="tm-pane-title">{t.nav.myCourses || 'My Courses'}</h1>
                  </div>

                  {myCoursesList.length === 0 ? (
                    <div className="tm-empty-state-card">
                      <span className="tm-empty-state-tag">[ NO ACTIVE ENROLLMENT ]</span>
                      <h3 className="tm-empty-state-title">No Enrolled Courses Found</h3>
                      <p className="tm-empty-state-desc">
                        You have not enrolled in any trading program yet. Only courses with verified payments or authorized admin approvals appear here.
                      </p>
                      <button
                        type="button"
                        className="tm-btn-solid-primary"
                        onClick={() => setActiveTab('courses')}
                      >
                        Explore All Courses &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="tm-mycourses-grid">
                      {myCoursesList.map((course) => {
                        const isInProcess = Boolean(course.is_in_process || course.status === 'IN PROCESS');
                        const isRejected = Boolean(course.is_rejected || course.status === 'PAYMENT REJECTED');
                        const isEnrolled = Boolean(course.access_granted || (!isInProcess && !isRejected && course.enrollment_status === 'enrolled'));

                        return (
                          <div
                            key={course.enrollment_id || course.course_id || course.id}
                            className={`tm-mycourse-card ${isInProcess ? 'is-in-process' : ''} ${isRejected ? 'is-rejected' : ''}`}
                          >
                            <div className="tm-mycourse-thumb-box">
                              <img
                                src={course.thumbnail || '/1-c.jpeg'}
                                alt={course.title}
                                className="tm-mycourse-thumb-img"
                                onError={(e) => {
                                  e.target.src = '/1-c.jpeg';
                                }}
                              />
                              {isInProcess ? (
                                <span className="tm-mycourse-badge tm-badge-in-process">[ IN PROCESS ]</span>
                              ) : isRejected ? (
                                <span className="tm-mycourse-badge tm-badge-rejected">[ PAYMENT REJECTED ]</span>
                              ) : (
                                <span className="tm-mycourse-badge">[ ENROLLED ]</span>
                              )}
                            </div>

                            <div className="tm-mycourse-card-content">
                              <div className="tm-mycourse-meta-top">
                                <span>{course.batch_name || 'November'} Cohort</span>
                                <span>{course.learning_mode || 'Live Online'}</span>
                              </div>

                              <h3 className="tm-mycourse-title">{course.title}</h3>

                              {/* STATUS NOTE */}
                              {isInProcess && (
                                <div className="tm-mycourse-status-note tm-note-in-process">
                                  <Clock size={13} className="tm-note-icon" />
                                  <span>Your payment is in process. Your course access will be activated after admin verification.</span>
                                </div>
                              )}
                              {isRejected && (
                                <div className="tm-mycourse-status-note tm-note-rejected">
                                  <AlertCircle size={13} className="tm-note-icon" />
                                  <span>{course.rejection_reason ? `Rejection reason: ${course.rejection_reason}` : 'Your payment could not be verified by admissions.'}</span>
                                </div>
                              )}
                              {!isInProcess && !isRejected && (
                                <p className="tm-mycourse-desc">{course.subtitle || course.description}</p>
                              )}

                              <div className="tm-mycourse-specs">
                                <span>⏱ Duration: {course.duration || '30 Days'}</span>
                                {course.transaction_ref ? (
                                  <span>💳 UTR: {course.transaction_ref.length > 4 ? `••••${course.transaction_ref.slice(-4)}` : course.transaction_ref}</span>
                                ) : (
                                  <span>📊 Level: {course.level || 'Institutional'}</span>
                                )}
                              </div>

                              <div className="tm-mycourse-actions">
                                {isInProcess ? (
                                  <div className="tm-in-process-actions-block">
                                    <button
                                      type="button"
                                      className="tm-mycourse-btn-locked"
                                      disabled
                                      title="Course content is protected until your payment is verified by an admin."
                                    >
                                      <Lock size={14} />
                                      <span>Access Locked (Verification Pending)</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="tm-mycourse-link-payments"
                                      onClick={() => setActiveTab('payments')}
                                    >
                                      View Payment Status #{course.claim_id || 'Claim'} &rarr;
                                    </button>
                                  </div>
                                ) : isRejected ? (
                                  <div className="tm-in-process-actions-block">
                                    <button
                                      type="button"
                                      className="tm-mycourse-btn-resubmit"
                                      onClick={() => handleEnrollCourse(course)}
                                    >
                                      <RefreshCw size={14} />
                                      <span>Resubmit Payment Proof</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="tm-mycourse-link-payments"
                                      onClick={() => setActiveTab('payments')}
                                    >
                                      View Rejection Details &rarr;
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="tm-mycourse-btn-primary tm-btn-view-course"
                                    onClick={() => setActiveCourseClassroom(course.course_id || course.id)}
                                  >
                                    <span>View Course</span>
                                    <span>&rarr;</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ==============================================================
                  TAB 3: COURSES CATALOG (Available Courses)
                  ============================================================== */}
              {activeTab === 'courses' && (
                <div className="tm-tab-pane tm-courses-view">
                  <div className="tm-pane-header">
                    <h1 className="tm-pane-title">{t.courses.pageTitle || 'Available Courses'}</h1>
                  </div>

                  {coursesList.length === 0 ? (
                    <div className="tm-empty-state-card">
                      <span className="tm-empty-state-tag">[ NO COURSES ]</span>
                      <h3 className="tm-empty-state-title">{t.courses.noCourses}</h3>
                    </div>
                  ) : (
                    <div className="tm-courses-cards-list">
                      {coursesList.map((c) => {
                        const price = parseFloat(c.price) || 19999;
                        const originalPrice = parseFloat(c.original_price) || 24999;
                        const savings = originalPrice > price ? originalPrice - price : 0;
                        const isEnrolled = Boolean(c.is_enrolled);
                        const isInProcess = Boolean(c.is_in_process);
                        const isRejected = Boolean(c.is_rejected);

                        return (
                          <div key={c.id} className="tm-catalog-course-card">
                            {/* Perfectly bounded, non-overflowing course image */}
                            <div className="tm-catalog-card-image-col">
                              <div className="tm-catalog-img-inner-frame">
                                <img
                                  src={c.thumbnail || '/1-c.jpeg'}
                                  alt={c.title}
                                  className="tm-catalog-card-img"
                                  onError={(e) => {
                                    e.target.src = '/1-c.jpeg';
                                  }}
                                />
                              </div>
                            </div>

                            <div className="tm-catalog-card-body-col">
                              <div className="tm-catalog-eyebrow-row">
                                <span className="tm-catalog-brand-label">TRADEMAX INSTITUTIONAL</span>
                                {isEnrolled ? (
                                  <span className="tm-badge-enrolled">[ {t.common.enrolled.toUpperCase()} ]</span>
                                ) : isInProcess ? (
                                  <span className="tm-badge-in-process">[ IN PROCESS ]</span>
                                ) : isRejected ? (
                                  <span className="tm-badge-rejected">[ REJECTED ]</span>
                                ) : null}
                              </div>

                              <h2 className="tm-catalog-course-title">{c.title}</h2>
                              <div className="tm-catalog-course-subtitle">{c.subtitle}</div>
                              <p className="tm-catalog-course-desc">{c.description}</p>

                              <div className="tm-catalog-specs-row">
                                <div className="tm-spec-box">
                                  <span className="tm-spec-key">{t.courses.duration}</span>
                                  <span className="tm-spec-val">{c.duration || '1 Month'}</span>
                                </div>
                                <div className="tm-spec-box">
                                  <span className="tm-spec-key">{t.courses.mode}</span>
                                  <span className="tm-spec-val">{c.learning_mode || 'Live Online'}</span>
                                </div>
                                <div className="tm-spec-box">
                                  <span className="tm-spec-key">{t.courses.batch}</span>
                                  <span className="tm-spec-val">{c.batch_name || 'November'}</span>
                                </div>
                              </div>

                              <div className="tm-catalog-footer-row">
                                <div className="tm-catalog-pricing">
                                  <span className="tm-fee-label">{t.courses.fee}:</span>
                                  <span className="tm-price-amount">₹{price.toLocaleString('en-IN')}</span>
                                  {originalPrice > price && (
                                    <span className="tm-original-amount">₹{originalPrice.toLocaleString('en-IN')}</span>
                                  )}
                                  {savings > 0 && (
                                    <span className="tm-savings-tag">
                                      {t.courses.saveAmount} ₹{savings.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>

                                <div className="tm-catalog-buttons">
                                  <button
                                    type="button"
                                    className="tm-btn-solid-secondary"
                                    onClick={() => onOpenCourseDetails(c)}
                                  >
                                    {t.common.viewDetails}
                                  </button>

                                  {isEnrolled ? (
                                    <>
                                      <span className="tm-catalog-badge-enrolled">
                                        ENROLLED
                                      </span>
                                      <button
                                        type="button"
                                        className="tm-btn-solid-primary tm-btn-view-course"
                                        onClick={() => {
                                          setActiveTab('my-courses');
                                          setActiveCourseClassroom(c.id);
                                        }}
                                      >
                                        View Course &rarr;
                                      </button>
                                    </>
                                  ) : isInProcess ? (
                                    <>
                                      <span className="tm-catalog-badge-in-process">
                                        IN PROCESS
                                      </span>
                                      <button
                                        type="button"
                                        className="tm-btn-solid-secondary tm-btn-track-status"
                                        onClick={() => setActiveTab('my-courses')}
                                      >
                                        Track Status &rarr;
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      className="tm-btn-solid-primary"
                                      onClick={() => handleEnrollCourse(c)}
                                      disabled={enrollingCourseId === c.id}
                                    >
                                      {enrollingCourseId === c.id ? t.common.saving : t.common.enrollNow}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ==============================================================
                  TAB 3: LIVE CLASSES
                  ============================================================== */}
              {activeTab === 'live-classes' && (
                <div className="tm-tab-pane tm-live-view">
                  {liveClassesList.length === 0 ? (
                    <div className="tm-empty-state-card">
                      <span className="tm-empty-state-tag">[ SCHEDULE EMPTY ]</span>
                      <h3 className="tm-empty-state-title">{t.liveClasses.noClassesTitle}</h3>
                      <p className="tm-empty-state-desc">{t.liveClasses.noClassesDesc}</p>
                    </div>
                  ) : (
                    <div className="tm-sessions-table-wrap">
                      <table className="tm-portal-table">
                        <thead>
                          <tr>
                            <th>SESSION DETAILS</th>
                            <th>BATCH</th>
                            <th>{t.liveClasses.time.toUpperCase()}</th>
                            <th>{t.liveClasses.durationMins.toUpperCase()}</th>
                            <th>{t.liveClasses.platform.toUpperCase()}</th>
                            <th>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveClassesList.map((session) => (
                            <tr key={session.id}>
                              <td>
                                <div className="tm-session-title-cell">
                                  <span className="tm-table-title">{session.title}</span>
                                  <span className="tm-table-sub">Instructor: {session.instructor || 'Patil Trader'}</span>
                                </div>
                              </td>
                              <td>
                                <span className="tm-table-chip">{session.batch_name || 'November'}</span>
                              </td>
                              <td>
                                <div className="tm-table-time-cell">
                                  <span>
                                    {new Date(session.scheduled_at).toLocaleDateString(undefined, {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                  <span className="tm-table-sub">
                                    {new Date(session.scheduled_at).toLocaleTimeString(undefined, {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </td>
                              <td>{session.duration_minutes || 75} {t.liveClasses.minutesUnit}</td>
                              <td>{session.platform || 'Live Online'}</td>
                              <td>
                                {session.meeting_link ? (
                                  <a
                                    href={session.meeting_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tm-btn-table-action"
                                  >
                                    {t.liveClasses.joinMeeting}
                                  </a>
                                ) : (
                                  <span className="tm-table-sub">Link will be posted before class</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ==============================================================
                  TAB 4: ANNOUNCEMENTS
                  ============================================================== */}
              {activeTab === 'announcements' && (
                <div className="tm-tab-pane tm-announcements-view">
                  <div className="tm-pane-header">
                    <span className="tm-pane-eyebrow">ADMINISTRATIVE BULLETINS</span>
                    <h1 className="tm-pane-title">{t.announcements.pageTitle}</h1>
                    <p className="tm-pane-desc">{t.announcements.pageDesc}</p>
                  </div>

                  {announcementsList.length === 0 ? (
                    <div className="tm-empty-state-card">
                      <span className="tm-empty-state-tag">[ NO ANNOUNCEMENTS ]</span>
                      <h3 className="tm-empty-state-title">{t.announcements.noAnnouncementsTitle}</h3>
                      <p className="tm-empty-state-desc">{t.announcements.noAnnouncementsDesc}</p>
                    </div>
                  ) : (
                    <div className="tm-announcements-list">
                      {announcementsList.map((ann) => (
                        <article key={ann.id} className="tm-announcement-card">
                          <div className="tm-announcement-meta-bar">
                            <span className="tm-announcement-category">
                              [{ann.category ? ann.category.toUpperCase() : 'GENERAL'}]
                            </span>
                            <span className="tm-announcement-date">
                              {t.announcements.published}:{' '}
                              {new Date(ann.published_date || ann.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          <h2 className="tm-announcement-heading">{ann.title}</h2>
                          <div className="tm-announcement-content">
                            {ann.content.split('\n').map((paragraph, pIdx) => (
                              <p key={pIdx}>{paragraph}</p>
                            ))}
                          </div>

                          <div className="tm-announcement-footer">
                            <span className="tm-footer-issuer">TradeMax Institutional Desk</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ==============================================================
                  TAB 5: MY PAYMENTS & VERIFICATION STATUS
                  ============================================================== */}
              {activeTab === 'payments' && (
                <div className="tm-tab-pane tm-payments-view">
                  <div className="tm-pane-header">
                    <span className="tm-pane-eyebrow">TRANSACTION EVIDENCE &amp; VERIFICATION AUDIT</span>
                    <h1 className="tm-pane-title">My Payments &amp; Verification</h1>
                    <p className="tm-pane-desc">
                      Track the verification status of your course fee submissions. Payments are checked against our official bank statement before enrollment is confirmed.
                    </p>
                  </div>

                  {claimsLoading ? (
                    <div className="tm-claims-loading-card">
                      <div className="tm-spinner"></div>
                      <span>Loading payment verification records...</span>
                    </div>
                  ) : studentClaims.length === 0 ? (
                    <div className="tm-empty-state-card">
                      <span className="tm-empty-state-tag">[ NO PAYMENT RECORDS ]</span>
                      <h3 className="tm-empty-state-title">No Payment Claims Found</h3>
                      <p className="tm-empty-state-desc">
                        When you enroll in a course and submit your UPI transaction reference and payment screenshot, your claims and verification status will appear here.
                      </p>
                      <button
                        type="button"
                        className="tm-btn-solid-primary"
                        onClick={() => setActiveTab('courses')}
                      >
                        Browse Courses &rarr;
                      </button>
                    </div>
                  ) : (
                    <div className="tm-claims-list">
                      {studentClaims.map((claim) => {
                        const isPending = claim.status === 'PENDING';
                        const isUnderReview = claim.status === 'UNDER_REVIEW';
                        const isApproved = claim.status === 'APPROVED';
                        const isRejected = claim.status === 'REJECTED';

                        return (
                          <div
                            key={claim.id}
                            className={`tm-claim-card tm-claim-card-${claim.status.toLowerCase()}`}
                          >
                            <div className="tm-claim-header-row">
                              <div className="tm-claim-title-group">
                                <span className="tm-claim-id-tag">{claim.claim_id}</span>
                                <h3 className="tm-claim-course-title">{claim.course_title}</h3>
                                <span className="tm-claim-batch">{claim.batch_name || 'November'} Cohort</span>
                              </div>

                              <div className="tm-claim-status-badge-wrap">
                                {isPending && (
                                  <span className="tm-status-pill tm-status-pending">
                                    <Clock size={13} /> Awaiting Verification
                                  </span>
                                )}
                                {isUnderReview && (
                                  <span className="tm-status-pill tm-status-under-review">
                                    <Clock size={13} /> Under Review
                                  </span>
                                )}
                                {isApproved && (
                                  <span className="tm-status-pill tm-status-approved">
                                    <CheckCircle2 size={13} /> Payment Approved
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="tm-status-pill tm-status-rejected">
                                    <AlertCircle size={13} /> Payment Rejected
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="tm-claim-details-grid">
                              <div className="tm-claim-detail-item">
                                <span className="tm-detail-label">Amount Claimed</span>
                                <strong className="tm-detail-val tm-amount-val">
                                  ₹{parseFloat(claim.amount).toLocaleString('en-IN')}
                                </strong>
                              </div>
                              <div className="tm-claim-detail-item">
                                <span className="tm-detail-label">UPI Reference / UTR</span>
                                <strong className="tm-detail-val tm-utr-mono">
                                  {claim.masked_transaction_ref || claim.transaction_ref}
                                </strong>
                              </div>
                              <div className="tm-claim-detail-item">
                                <span className="tm-detail-label">Submission Date</span>
                                <span className="tm-detail-val">
                                  {new Date(claim.created_at).toLocaleString('en-IN', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Rejection Reason Alert if applicable */}
                            {isRejected && claim.rejection_reason && (
                              <div className="tm-claim-rejection-box">
                                <AlertCircle size={16} className="tm-rejection-icon" />
                                <div>
                                  <strong>Admissions Review Note:</strong>
                                  <p>{claim.rejection_reason}</p>
                                </div>
                              </div>
                            )}

                            {/* Next Action Strip */}
                            <div className="tm-claim-next-action-strip">
                              <div className="tm-next-action-info">
                                <span className="tm-next-action-label">Next Action:</span>
                                <span className="tm-next-action-text">{claim.next_action}</span>
                              </div>

                              <div className="tm-claim-actions-group">
                                <button
                                  type="button"
                                  className="tm-btn-view-evidence"
                                  onClick={() => setPreviewScreenshotClaim(claim)}
                                >
                                  <Eye size={13} />
                                  <span>View Screenshot</span>
                                </button>

                                {isApproved && (
                                  <button
                                    type="button"
                                    className="tm-btn-access-classroom"
                                    onClick={() => setActiveCourseClassroom(claim.course_id)}
                                  >
                                    Access Course &rarr;
                                  </button>
                                )}

                                {isRejected && (
                                  <button
                                    type="button"
                                    className="tm-btn-resubmit-claim"
                                    onClick={() => {
                                      setEnrollModalCourse({
                                        id: claim.course_id,
                                        slug: claim.course_slug,
                                        title: claim.course_title,
                                        price: claim.amount,
                                      });
                                    }}
                                  >
                                    Resubmit Evidence
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUPPORT TICKETS */}
              {activeTab === 'support' && (
                <StudentTickets
                  theme={theme}
                  user={user || dashboardData?.profile}
                  authToken={localStorage.getItem('tm_token')}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Manual Payment Modal Triggered From Courses / Resubmissions */}
      {enrollModalCourse && (
        <CourseRegistrationModal
          isOpen={Boolean(enrollModalCourse)}
          onClose={() => {
            setEnrollModalCourse(null);
            fetchPortalData();
            fetchStudentClaims();
          }}
          course={enrollModalCourse}
          user={user || dashboardData?.profile}
          onNavigate={(tab) => {
            setEnrollModalCourse(null);
            handleTabSwitch(tab);
            fetchPortalData();
            fetchStudentClaims();
          }}
        />
      )}

      {/* Screenshot Preview Modal (IDOR Protected secure endpoint) */}
      {previewScreenshotClaim && (
        <div
          className="tm-course-modal-backdrop tm-screenshot-modal-backdrop"
          onClick={() => setPreviewScreenshotClaim(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="tm-course-modal-card tm-screenshot-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="tm-course-modal-close"
              onClick={() => setPreviewScreenshotClaim(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="tm-screenshot-modal-header">
              <span className="tm-modal-eyebrow">SUBMITTED EVIDENCE</span>
              <h3 className="tm-course-modal-title">
                Payment Screenshot &middot; {previewScreenshotClaim.claim_id}
              </h3>
              <p className="tm-course-modal-sub">
                UTR: {previewScreenshotClaim.masked_transaction_ref || previewScreenshotClaim.transaction_ref}
              </p>
            </div>
            <div className="tm-screenshot-modal-img-wrap">
              <img
                src={`/api/student/payment-claims/${previewScreenshotClaim.id}/screenshot`}
                alt="Submitted payment evidence"
                className="tm-screenshot-modal-img"
              />
            </div>
            <div className="tm-screenshot-modal-footer">
              <button
                type="button"
                className="tm-reg-btn-secondary"
                onClick={() => setPreviewScreenshotClaim(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;

