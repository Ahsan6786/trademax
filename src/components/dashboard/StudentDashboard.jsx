import React, { useState, useEffect, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, getTranslation } from '../../i18n/translations';
import './StudentDashboard.css';

export const StudentDashboard = ({
  user,
  course: primaryCourse,
  onOpenCourseDetails,
  onLogout,
  onExit,
  theme = 'dark',
  onToggleTheme,
}) => {
  // Navigation tabs: dashboard | courses | live-classes | announcements | settings
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

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
  const [liveClassesList, setLiveClassesList] = useState([]);
  const [announcementsList, setAnnouncementsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  // Settings form states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    trading_experience: user?.trading_experience || 'Intermediate',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // 1-click enroll loading state
  const [enrollingCourseId, setEnrollingCourseId] = useState(null);

  // Scroll to top on tab switch
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
  }, [activeTab]);

  // Fetch Dashboard & Portal Data from PostgreSQL Backend
  const fetchPortalData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, coursesRes, liveRes, announceRes] = await Promise.all([
        fetch('/api/student/dashboard', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/student/courses', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/student/live-classes', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/student/announcements', { credentials: 'include' }).then((r) => r.json()).catch(() => ({ success: false })),
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

      if (liveRes.success && Array.isArray(liveRes.liveClasses)) {
        setLiveClassesList(liveRes.liveClasses);
      }

      if (announceRes.success && Array.isArray(announceRes.announcements)) {
        setAnnouncementsList(announceRes.announcements);
      }
    } catch (err) {
      console.warn('Error fetching student portal data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  // Toast Notification Helper
  const showToast = (text, type = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 4500);
  };

  // Instant Enrollment Handler
  const handleEnrollCourse = async (courseToEnroll) => {
    try {
      setEnrollingCourseId(courseToEnroll.id);
      const studentName = profileForm.name || user?.name || 'TradeMax Student';
      const studentEmail = user?.email || dashboardData?.profile?.email || '';
      const studentMobile = profileForm.mobile || user?.mobile || '8799026206';
      const studentExperience = profileForm.trading_experience || user?.trading_experience || 'Intermediate';

      const res = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          course_id: courseToEnroll.id,
          course_slug: courseToEnroll.slug || 'trading-masterclass',
          course_name: courseToEnroll.title,
          batch_name: courseToEnroll.batch_name || 'November',
          name: studentName,
          email: studentEmail,
          mobile: studentMobile,
          trading_experience: studentExperience,
          interest: 'Both',
          reference: 'Student Portal',
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(`${t.courses.enrollSuccess} (${courseToEnroll.title})`, 'success');
        await fetchPortalData();
      } else if (data.isDuplicate) {
        showToast(data.error || 'Already enrolled in this course.', 'error');
      } else {
        showToast(data.error || 'Enrollment could not be processed.', 'error');
      }
    } catch (err) {
      console.error('Enrollment error:', err);
      showToast('Connection error. Please try again.', 'error');
    } finally {
      setEnrollingCourseId(null);
    }
  };

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      showToast('Full name is required.', 'error');
      return;
    }

    try {
      setProfileSaving(true);
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();

      if (data.success) {
        showToast(t.settings.profileUpdated, 'success');
        fetchPortalData();
      } else {
        showToast(data.error || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      showToast('Network error while saving profile.', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast('Please fill in all password fields.', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast(t.settings.passShort, 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast(t.settings.passMismatch, 'error');
      return;
    }

    try {
      setPasswordSaving(true);
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(t.settings.passwordUpdated, 'success');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast(data.error || 'Failed to update password.', 'error');
      }
    } catch (err) {
      showToast('Network error while updating password.', 'error');
    } finally {
      setPasswordSaving(false);
    }
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
    averageProgress: enrolledCourses.length > 0 ? 35 : 0,
  };

  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, group: 'MAIN' },
    { id: 'courses', label: t.nav.courses, group: 'LEARNING' },
    { id: 'live-classes', label: t.nav.liveClasses, group: 'LEARNING' },
    { id: 'announcements', label: t.nav.announcements, group: 'LEARNING' },
    { id: 'settings', label: t.nav.settings, group: 'ACCOUNT' },
  ];

  const currentTabLabel = navItems.find((n) => n.id === activeTab)?.label || t.nav.dashboard;

  return (
    <div className={`tm-portal-layout tm-theme-${theme}`}>
      {/* ------------------------------------------------------------------
          1. RED & BLACK TOP NAVBAR (Clean, Sleek, No collapse btn, No logo, No welcome text, No logout btn)
          ------------------------------------------------------------------ */}
      <header className="tm-portal-header">
        <div className="tm-portal-header-left">
          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            className="tm-portal-mobile-menu-btn"
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            aria-label="Toggle Portal Navigation"
          >
            {isMobileDrawerOpen ? 'CLOSE' : 'MENU'}
          </button>

          {/* Desktop Sidebar Open Button (Shown when sidebar is closed) */}
          {!isSidebarOpen && (
            <button
              type="button"
              className="tm-portal-sidebar-open-btn"
              onClick={() => setIsSidebarOpen(true)}
              title="Open Sidebar"
              aria-label="Open Sidebar"
            >
              [ MENU ]
            </button>
          )}

          {/* Current Page Title (Like reference screenshot) */}
          <div className="tm-portal-header-page-title">
            <span className="tm-header-title-text">{currentTabLabel}</span>
          </div>
        </div>

        <div className="tm-portal-header-right">
          {/* Working 4-Language Selector */}
          <div className="tm-portal-lang-selector">
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

          {/* Functional Day/Night Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              className="tm-portal-theme-btn"
              onClick={() => onToggleTheme()}
              title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              {theme === 'dark' ? t.common.themeLight : t.common.themeDark}
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
          2. BODY CONTAINER: REFERENCE-STYLED SIDEBAR + MAIN CONTENT AREA
          ------------------------------------------------------------------ */}
      <div className="tm-portal-body">
        {/* Mobile Slide-out Drawer Backdrop */}
        {isMobileDrawerOpen && (
          <div
            className="tm-portal-drawer-backdrop"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Navigation Styled Exactly Like Reference Screenshot */}
        <aside
          className={`tm-portal-sidebar ${!isSidebarOpen ? 'is-closed' : ''} ${
            isMobileDrawerOpen ? 'is-drawer-open' : ''
          }`}
        >
          {/* TradeMax Brand Logo & Title In Sidebar Top + Close Button */}
          <div className="tm-sidebar-brand-box">
            <div className="tm-sidebar-brand-main" onClick={() => setActiveTab('dashboard')}>
              <img src="/tm-logo.png" alt="TradeMax" className="tm-sidebar-logo" />
              <div className="tm-sidebar-brand-info">
                <span className="tm-sidebar-brand-name">
                  TRADE<span className="tm-sidebar-brand-red">MAX</span>
                </span>
                <span className="tm-sidebar-brand-sub">BY PATIL TRADER</span>
              </div>
            </div>

            {/* Sidebar Close Button */}
            <button
              type="button"
              className="tm-sidebar-close-btn"
              onClick={() => {
                setIsSidebarOpen(false);
                setIsMobileDrawerOpen(false);
              }}
              title="Close Sidebar"
              aria-label="Close Sidebar"
            >
              &larr;
            </button>
          </div>

          {/* Navigation Menu Groups (MAIN, LEARNING, ACCOUNT) */}
          <div className="tm-sidebar-menu-scroll">
            {/* GROUP: MAIN */}
            <div className="tm-nav-group">
              <span className="tm-group-title">MAIN</span>
              <button
                type="button"
                className={`tm-sidebar-nav-item ${activeTab === 'dashboard' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('dashboard');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <span className="tm-nav-text">{t.nav.dashboard}</span>
              </button>
            </div>

            <div className="tm-nav-divider" />

            {/* GROUP: LEARNING / ACADEMICS */}
            <div className="tm-nav-group">
              <span className="tm-group-title">ACADEMICS</span>
              <button
                type="button"
                className={`tm-sidebar-nav-item ${activeTab === 'courses' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('courses');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <span className="tm-nav-text">{t.nav.courses}</span>
              </button>
              <button
                type="button"
                className={`tm-sidebar-nav-item ${activeTab === 'live-classes' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('live-classes');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <span className="tm-nav-text">{t.nav.liveClasses}</span>
              </button>
              <button
                type="button"
                className={`tm-sidebar-nav-item ${activeTab === 'announcements' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('announcements');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <span className="tm-nav-text">{t.nav.announcements}</span>
              </button>
            </div>

            <div className="tm-nav-divider" />

            {/* GROUP: ACCOUNT */}
            <div className="tm-nav-group">
              <span className="tm-group-title">ACCOUNT</span>
              <button
                type="button"
                className={`tm-sidebar-nav-item ${activeTab === 'settings' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('settings');
                  setIsMobileDrawerOpen(false);
                }}
              >
                <span className="tm-nav-text">{t.nav.settings}</span>
              </button>
            </div>
          </div>

          {/* Reference-Styled Sidebar Footer: User Card + Sign Out Button */}
          <div className="tm-sidebar-footer">
            <div className="tm-sidebar-user-card">
              <div className="tm-user-avatar-circle" title={displayName}>
                {getInitials(displayName)}
              </div>
              <div className="tm-user-info-text">
                <span className="tm-user-name-text">{displayName}</span>
                <span className="tm-user-role-text">{userEmail}</span>
              </div>
            </div>

            <button
              type="button"
              className="tm-sidebar-logout-btn"
              onClick={onLogout}
              title={t.nav.logout}
            >
              <span className="tm-logout-arrow" aria-hidden="true">&rarr;</span>
              <span>{t.nav.logout}</span>
            </button>
          </div>
        </aside>

        {/* ------------------------------------------------------------------
            3. MAIN CONTENT VIEWS
            ------------------------------------------------------------------ */}
        <main className="tm-portal-main">
          {loading && !dashboardData ? (
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
                  {/* Welcome Greeting Banner */}
                  <div className="tm-welcome-banner">
                    <div className="tm-welcome-copy">
                      <span className="tm-welcome-eyebrow">STUDENT LEARNING OVERVIEW</span>
                      <h1 className="tm-welcome-title">
                        {t.common.welcome}, {displayName}
                      </h1>
                      <p className="tm-welcome-desc">{t.dashboard.greetingSub}</p>
                    </div>
                    <div className="tm-welcome-actions">
                      <button
                        type="button"
                        className="tm-btn-solid-primary"
                        onClick={() => setActiveTab('courses')}
                      >
                        {t.common.exploreCourses}
                      </button>
                    </div>
                  </div>

                  {/* 3 Metric Cards */}
                  <div className="tm-stats-grid">
                    <div className="tm-stat-card">
                      <span className="tm-stat-label">{t.dashboard.statEnrolled}</span>
                      <span className="tm-stat-value">{stats.totalEnrolled}</span>
                      <span className="tm-stat-sub">Active institutional cohorts</span>
                    </div>

                    <div className="tm-stat-card">
                      <span className="tm-stat-label">{t.dashboard.statProgress}</span>
                      <span className="tm-stat-value">{stats.averageProgress}%</span>
                      <div className="tm-stat-progressbar">
                        <div
                          className="tm-stat-progressbar-fill"
                          style={{ width: `${Math.min(100, stats.averageProgress)}%` }}
                        />
                      </div>
                    </div>

                    <div className="tm-stat-card">
                      <span className="tm-stat-label">{t.dashboard.statUpcoming}</span>
                      <span className="tm-stat-value">{stats.upcomingSessionsCount}</span>
                      <span className="tm-stat-sub">Scheduled live classes</span>
                    </div>
                  </div>

                  {/* Enrolled Courses Section */}
                  <section className="tm-portal-section">
                    <div className="tm-section-header-row">
                      <div>
                        <h2 className="tm-section-title">{t.dashboard.myCourses}</h2>
                        <span className="tm-section-sub">
                          Programs linked to your student registration in PostgreSQL
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

                              <div className="tm-enrolled-progress-wrap">
                                <div className="tm-progress-labels">
                                  <span>{t.dashboard.progressLabel}</span>
                                  <span>{item.progress_percentage}%</span>
                                </div>
                                <div className="tm-progress-track">
                                  <div
                                    className="tm-progress-bar"
                                    style={{ width: `${item.progress_percentage}%` }}
                                  />
                                </div>
                              </div>

                              <div className="tm-enrolled-actions">
                                <button
                                  type="button"
                                  className="tm-btn-solid-secondary"
                                  onClick={onOpenCourseDetails}
                                >
                                  {t.common.viewDetails}
                                </button>
                                <button
                                  type="button"
                                  className="tm-btn-solid-primary"
                                  onClick={() => setActiveTab('live-classes')}
                                >
                                  {t.dashboard.nextClass}
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
                  TAB 2: COURSES CATALOG (Available Courses)
                  ============================================================== */}
              {activeTab === 'courses' && (
                <div className="tm-tab-pane tm-courses-view">
                  <div className="tm-pane-header">
                    <span className="tm-pane-eyebrow">POSTGRESQL CURRICULUM CATALOG</span>
                    <h1 className="tm-pane-title">{t.courses.pageTitle}</h1>
                    <p className="tm-pane-desc">{t.courses.pageDesc}</p>
                  </div>

                  {coursesList.length === 0 ? (
                    <div className="tm-empty-state-card">
                      <span className="tm-empty-state-tag">[ DATABASE SYNC ]</span>
                      <h3 className="tm-empty-state-title">{t.courses.noCourses}</h3>
                    </div>
                  ) : (
                    <div className="tm-courses-cards-list">
                      {coursesList.map((c) => {
                        const price = parseFloat(c.price) || 19999;
                        const originalPrice = parseFloat(c.original_price) || 24999;
                        const savings = originalPrice > price ? originalPrice - price : 0;
                        const isEnrolled = Boolean(c.is_enrolled);

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
                                {isEnrolled && (
                                  <span className="tm-badge-enrolled">[ {t.common.enrolled.toUpperCase()} ]</span>
                                )}
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
                                    onClick={onOpenCourseDetails}
                                  >
                                    {t.common.viewDetails}
                                  </button>

                                  {isEnrolled ? (
                                    <button
                                      type="button"
                                      className="tm-btn-solid-enrolled"
                                      disabled
                                    >
                                      {t.courses.alreadyEnrolled}
                                    </button>
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
                  <div className="tm-pane-header">
                    <span className="tm-pane-eyebrow">INSTITUTIONAL MENTORSHIP & SESSIONS</span>
                    <h1 className="tm-pane-title">{t.liveClasses.pageTitle}</h1>
                    <p className="tm-pane-desc">{t.liveClasses.pageDesc}</p>
                  </div>

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
                  TAB 5: SETTINGS & PREFERENCES
                  ============================================================== */}
              {activeTab === 'settings' && (
                <div className="tm-tab-pane tm-settings-view">
                  <div className="tm-pane-header">
                    <span className="tm-pane-eyebrow">PORTAL PREFERENCES & SECURITY</span>
                    <h1 className="tm-pane-title">{t.settings.pageTitle}</h1>
                    <p className="tm-pane-desc">{t.settings.pageDesc}</p>
                  </div>

                  <div className="tm-settings-grid">
                    {/* Section 1: Profile Details */}
                    <div className="tm-settings-card">
                      <h3 className="tm-settings-card-title">{t.settings.profileSection}</h3>
                      <form onSubmit={handleProfileSubmit} className="tm-portal-form">
                        <div className="tm-form-field">
                          <label className="tm-field-label">{t.settings.name} *</label>
                          <input
                            type="text"
                            className="tm-form-input"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            required
                          />
                        </div>

                        <div className="tm-form-field">
                          <label className="tm-field-label">{t.settings.email}</label>
                          <input
                            type="email"
                            className="tm-form-input is-readonly"
                            value={user?.email || dashboardData?.profile?.email || ''}
                            readOnly
                            disabled
                          />
                          <span className="tm-field-hint">{t.settings.emailNotice}</span>
                        </div>

                        <div className="tm-form-field">
                          <label className="tm-field-label">{t.settings.mobile} *</label>
                          <input
                            type="tel"
                            className="tm-form-input"
                            value={profileForm.mobile}
                            onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                            placeholder="e.g. 9876543210"
                            required
                          />
                        </div>

                        <div className="tm-form-field">
                          <label className="tm-field-label">{t.settings.tradingExp}</label>
                          <select
                            className="tm-form-select"
                            value={profileForm.trading_experience}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, trading_experience: e.target.value })
                            }
                          >
                            <option value="Beginner">Beginner (0-1 Years)</option>
                            <option value="Intermediate">Intermediate (1-3 Years)</option>
                            <option value="Advanced">Advanced (3-5 Years)</option>
                            <option value="Professional">Professional (Institutional)</option>
                          </select>
                        </div>

                        <div className="tm-form-actions">
                          <button
                            type="submit"
                            className="tm-btn-solid-primary"
                            disabled={profileSaving}
                          >
                            {profileSaving ? t.common.saving : t.common.saveChanges}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Section 2: Preferences (Language + Theme) */}
                    <div className="tm-settings-card">
                      <h3 className="tm-settings-card-title">{t.settings.prefSection}</h3>

                      <div className="tm-pref-group">
                        <label className="tm-field-label">{t.settings.langPref}</label>
                        <p className="tm-pref-desc">
                          Select your preferred interface language. The portal updates immediately without reloading.
                        </p>
                        <div className="tm-lang-options-grid">
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                              key={lang.code}
                              type="button"
                              className={`tm-lang-option-card ${currentLang === lang.code ? 'is-selected' : ''}`}
                              onClick={() => handleLanguageChange(lang.code)}
                            >
                              <span className="tm-lang-card-code">{lang.short}</span>
                              <span className="tm-lang-card-label">{lang.label}</span>
                              {currentLang === lang.code && (
                                <span className="tm-lang-card-active-tag">[ ACTIVE ]</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="tm-pref-group" style={{ marginTop: '2rem' }}>
                        <label className="tm-field-label">{t.settings.themePref}</label>
                        <p className="tm-pref-desc">
                          Toggle between High-Contrast Dark mode and Clean White Day mode.
                        </p>
                        <div className="tm-theme-switch-row">
                          <button
                            type="button"
                            className={`tm-theme-option-btn ${theme === 'light' ? 'is-selected' : ''}`}
                            onClick={() => onToggleTheme && onToggleTheme('light')}
                          >
                            [ DAY MODE (LIGHT) ]
                          </button>
                          <button
                            type="button"
                            className={`tm-theme-option-btn ${theme === 'dark' ? 'is-selected' : ''}`}
                            onClick={() => onToggleTheme && onToggleTheme('dark')}
                          >
                            [ NIGHT MODE (DARK) ]
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Password & Security */}
                    <div className="tm-settings-card tm-card-fullwidth">
                      <h3 className="tm-settings-card-title">{t.settings.securitySection}</h3>
                      <form onSubmit={handlePasswordSubmit} className="tm-portal-form tm-password-form-grid">
                        <div className="tm-form-field">
                          <label className="tm-field-label">{t.settings.currentPass} *</label>
                          <input
                            type="password"
                            className="tm-form-input"
                            value={passwordForm.currentPassword}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                            }
                            required
                          />
                        </div>

                        <div className="tm-form-field">
                          <label className="tm-field-label">{t.settings.newPass} *</label>
                          <input
                            type="password"
                            className="tm-form-input"
                            value={passwordForm.newPassword}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                            }
                            required
                            minLength={6}
                          />
                        </div>

                        <div className="tm-form-field">
                          <label className="tm-field-label">{t.settings.confirmPass} *</label>
                          <input
                            type="password"
                            className="tm-form-input"
                            value={passwordForm.confirmPassword}
                            onChange={(e) =>
                              setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                            }
                            required
                            minLength={6}
                          />
                        </div>

                        <div className="tm-form-actions tm-col-span-full">
                          <button
                            type="submit"
                            className="tm-btn-solid-primary"
                            disabled={passwordSaving}
                          >
                            {passwordSaving ? t.common.saving : t.settings.updatePassword}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
