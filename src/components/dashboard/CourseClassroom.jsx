import React, { useState, useEffect, useCallback } from 'react';
import './CourseClassroom.css';

// Pure helper to parse course topics safely without violating Rules of Hooks
const parseCourseTopics = (topics) => {
  if (!topics) return [];
  if (Array.isArray(topics)) return topics;
  if (typeof topics === 'string') {
    try {
      const parsed = JSON.parse(topics);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return topics.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

export const CourseClassroom = ({ courseId, user, onBack, theme = 'dark' }) => {
  const [activeTab, setActiveTab] = useState('recorded-lectures');
  const [classroomData, setClassroomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [togglingProgress, setTogglingProgress] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [loadingPlayback, setLoadingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);

  // Fetch secure short-lived playback URL on demand for the active lesson
  const fetchPlaybackUrl = useCallback(async (lesson) => {
    if (!lesson) return;
    try {
      setLoadingPlayback(true);
      setPlaybackError(null);
      const res = await fetch(`/api/student/courses/${courseId}/lessons/${lesson.id}/playback-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPlaybackError(data.error || 'Failed to authorize video playback.');
        setPlaybackUrl('');
        return;
      }
      setPlaybackUrl(data.playbackUrl);
    } catch (err) {
      console.error('[Playback URL Error]:', err);
      setPlaybackError('Unable to connect to streaming server.');
    } finally {
      setLoadingPlayback(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (activeLesson) {
      fetchPlaybackUrl(activeLesson);
    }
  }, [activeLesson, fetchPlaybackUrl]);

  // Fetch Classroom Data with strict server-side authorization
  const fetchClassroom = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/student/courses/${courseId}/classroom`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load course classroom.');
        return;
      }

      setClassroomData(data.data);

      // Auto-select first lesson or first uncompleted lesson
      if (data.data?.lessons?.length > 0) {
        const uncompleted = data.data.lessons.find((l) => !l.is_completed);
        setActiveLesson(uncompleted || data.data.lessons[0]);
      }
    } catch (err) {
      console.error('[Classroom Load Error]:', err);
      setError('Unable to reach server. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchClassroom();
  }, [fetchClassroom]);

  // Handle Mark Lesson Complete
  const handleToggleComplete = async (lesson) => {
    if (!lesson || togglingProgress) return;
    try {
      setTogglingProgress(true);
      const nextCompleted = !lesson.is_completed;
      const res = await fetch(
        `/api/student/courses/${courseId}/lessons/${lesson.id}/progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ is_completed: nextCompleted }),
        }
      );
      const data = await res.json();

      if (data.success) {
        // Update local lesson state
        setClassroomData((prev) => {
          if (!prev) return prev;
          const updatedLessons = prev.lessons.map((l) =>
            l.id === lesson.id ? { ...l, is_completed: nextCompleted } : l
          );
          return {
            ...prev,
            lessons: updatedLessons,
            stats: {
              ...prev.stats,
              completedLessons: data.stats.completedLessons,
              progressPercentage: data.stats.progressPercentage,
            },
            enrollment: {
              ...prev.enrollment,
              completed_lessons: data.stats.completedLessons,
              progress_percentage: data.stats.progressPercentage,
            },
          };
        });

        if (activeLesson?.id === lesson.id) {
          setActiveLesson((prev) => ({ ...prev, is_completed: nextCompleted }));
        }

        // Notify parent portal to refresh overall metrics
        window.dispatchEvent(new CustomEvent('tm:enrollment_updated'));
      }
    } catch (err) {
      console.error('[Toggle Progress Error]:', err);
    } finally {
      setTogglingProgress(false);
    }
  };

  // Convert generic video links (YouTube watch/short URL) to embed format
  const getEmbedUrl = (url) => {
    if (!url) return '';
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const id = url.split('watch?v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`;
      }
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`;
      }
      return url;
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="tm-classroom-wrapper">
        <div className="tm-empty-classroom-state">
          <h3>Loading Classroom...</h3>
          <p>Authorizing enrollment access and loading institutional course modules.</p>
        </div>
      </div>
    );
  }

  if (error || !classroomData) {
    return (
      <div className="tm-classroom-wrapper">
        <div className="tm-classroom-topbar">
          <button type="button" className="tm-classroom-back-btn" onClick={onBack}>
            &larr; Back to My Courses
          </button>
        </div>
        <div className="tm-empty-classroom-state" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
          <h3 style={{ color: '#EF4444' }}>Authorization Notice</h3>
          <p>{error || 'You are not enrolled in this course or your payment is pending verification.'}</p>
          <button
            type="button"
            className="tm-classroom-back-btn"
            style={{ marginTop: '12px' }}
            onClick={onBack}
          >
            Return to My Courses
          </button>
        </div>
      </div>
    );
  }

  const {
    course,
    enrollment,
    stats,
    lessons = [],
    liveClasses = [],
    announcements = [],
    resources = [],
    notifications = [],
  } = classroomData;

  const progressPct = stats?.progressPercentage || enrollment?.progress_percentage || 0;
  const completedCount = stats?.completedLessons || enrollment?.completed_lessons || 0;
  const totalCount = stats?.totalLessons || lessons.length || 1;

  const topicsList = parseCourseTopics(course?.topics);

  return (
    <div className={`tm-classroom-wrapper tm-theme-${theme}`}>
      {/* Top Action Bar */}
      <div className="tm-classroom-topbar">
        <button type="button" className="tm-classroom-back-btn" onClick={onBack}>
          &larr; Back to My Courses
        </button>
        <div className="tm-classroom-cohort-pill">
          <span className="tm-cohort-dot" />
          <span>{course.batch_name || 'November'} Batch · {course.learning_mode || 'Live Online'}</span>
        </div>
      </div>

      {/* Course Hero Banner */}
      <div className="tm-classroom-hero">
        <div className="tm-classroom-hero-thumb-box">
          <img
            src={course.thumbnail || '/1-c.jpeg'}
            alt={course.title}
            className="tm-classroom-hero-thumb"
            onError={(e) => {
              e.target.src = '/1-c.jpeg';
            }}
          />
        </div>
        <div className="tm-classroom-hero-details">
          <span className="tm-classroom-hero-batch">
            {course.learning_mode || 'Live Online'} · {course.duration || '30 Days'}
          </span>
          <h1 className="tm-classroom-hero-title">{course.title}</h1>
          <p className="tm-classroom-hero-subtitle">{course.subtitle || course.description}</p>
        </div>
      </div>

      {/* Classroom Navigation Sub-Tabs */}
      <div className="tm-classroom-nav-tabs">
        <button
          type="button"
          className={`tm-classroom-tab-btn ${activeTab === 'recorded-lectures' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('recorded-lectures')}
        >
          <span>Recorded Lectures</span>
          <span className="tm-tab-count-badge">{lessons.length}</span>
        </button>

        <button
          type="button"
          className={`tm-classroom-tab-btn ${activeTab === 'live-classes' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('live-classes')}
        >
          <span>Live Classes</span>
          <span className="tm-tab-count-badge">{liveClasses.length}</span>
        </button>

        <button
          type="button"
          className={`tm-classroom-tab-btn ${activeTab === 'resources' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          <span>Posts & Resources</span>
          <span className="tm-tab-count-badge">{resources.length}</span>
        </button>

        <button
          type="button"
          className={`tm-classroom-tab-btn ${activeTab === 'announcements' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          <span>Announcements</span>
          <span className="tm-tab-count-badge">{announcements.length}</span>
        </button>

        <button
          type="button"
          className={`tm-classroom-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`tm-classroom-tab-btn ${activeTab === 'notifications' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <span>Notifications</span>
          {notifications.length > 0 && (
            <span className="tm-tab-count-badge">{notifications.length}</span>
          )}
        </button>
      </div>

      {/* Classroom Content Body */}
      <div className="tm-classroom-content-body">
        {/* ==============================================================
            TAB 1: RECORDED LECTURES
            ============================================================== */}
        {activeTab === 'recorded-lectures' && (
          <div className="tm-lectures-layout">
            <div className="tm-lecture-player-col">
              {activeLesson ? (
                <>
                  <div className="tm-video-frame-container">
                    {loadingPlayback ? (
                      <div className="tm-video-loading-placeholder">
                        <div className="tm-spinner-ring" />
                        <span>Authorizing secure AWS S3 playback...</span>
                      </div>
                    ) : playbackError ? (
                      <div className="tm-video-error-placeholder">
                        <span className="tm-video-error-badge">ACCESS RESTRICTION</span>
                        <p>{playbackError}</p>
                        <button
                          type="button"
                          className="tm-btn-retry-playback"
                          onClick={() => fetchPlaybackUrl(activeLesson)}
                        >
                          Retry Playback
                        </button>
                      </div>
                    ) : playbackUrl && (playbackUrl.includes('s3.') || playbackUrl.includes('.mp4') || playbackUrl.includes('.webm') || playbackUrl.includes('amazonaws.com')) ? (
                      <video
                        key={playbackUrl}
                        src={playbackUrl}
                        controls
                        playsInline
                        className="tm-lecture-video"
                        controlsList="nodownload"
                        onEnded={() => handleToggleComplete(activeLesson)}
                      />
                    ) : playbackUrl ? (
                      <iframe
                        src={getEmbedUrl(playbackUrl || activeLesson.video_url)}
                        title={activeLesson.title}
                        className="tm-lecture-video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="tm-video-loading-placeholder">
                        <span>Preparing player...</span>
                      </div>
                    )}
                  </div>

                  <div className="tm-video-meta-box">
                    <div className="tm-video-meta-header">
                      <span className="tm-video-module-tag">
                        {activeLesson.module_name || 'Curriculum Lesson'} · {activeLesson.duration_minutes || 30} Mins
                      </span>
                      <button
                        type="button"
                        className={`tm-btn-complete-toggle ${activeLesson.is_completed ? 'is-completed' : ''}`}
                        onClick={() => handleToggleComplete(activeLesson)}
                        disabled={togglingProgress}
                      >
                        {activeLesson.is_completed ? '✓ Completed' : 'Mark as Complete'}
                      </button>
                    </div>

                    <h2>{activeLesson.title}</h2>
                    <p>{activeLesson.description || 'Watch this video lesson carefully and mark it as completed once you finish your notes.'}</p>
                  </div>
                </>
              ) : (
                <div className="tm-empty-classroom-state">
                  <h3>No Recorded Lessons Yet</h3>
                  <p>Recorded videos for this course will be published here by the instructor.</p>
                </div>
              )}
            </div>

            {/* Playlist Sidebar */}
            <div className="tm-lecture-playlist-col">
              <div className="tm-playlist-header">
                <h4>Course Curriculum ({lessons.length} Lessons)</h4>
                <span className="tm-tab-count-badge">
                  {completedCount}/{totalCount} Done
                </span>
              </div>

              <div className="tm-playlist-scroll">
                {lessons.map((lesson, idx) => {
                  const isActive = activeLesson?.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className={`tm-playlist-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => setActiveLesson(lesson)}
                    >
                      <div className="tm-playlist-item-left">
                        <span className="tm-playlist-num">{String(idx + 1).padStart(2, '0')}</span>
                        <div className="tm-playlist-meta">
                          <span className="tm-playlist-title">{lesson.title}</span>
                          <span className="tm-playlist-duration">
                            {lesson.module_name ? `${lesson.module_name} · ` : ''}{lesson.duration_minutes || 30} mins
                          </span>
                        </div>
                      </div>

                      {lesson.is_completed && (
                        <span className="tm-playlist-check" title="Completed">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 2: LIVE CLASSES
            ============================================================== */}
        {activeTab === 'live-classes' && (
          <div className="tm-live-classes-container">
            {liveClasses.length === 0 ? (
              <div className="tm-empty-classroom-state">
                <h3>No Upcoming Live Sessions</h3>
                <p>New live interactive Google Meet sessions will be posted here with calendar alerts.</p>
              </div>
            ) : (
              liveClasses.map((session) => {
                const dateObj = new Date(session.scheduled_at);
                const month = dateObj.toLocaleString('en-US', { month: 'short' });
                const day = dateObj.getDate();
                const timeStr = dateObj.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });
                const dateFull = dateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div key={session.id} className="tm-live-class-card">
                    <div className="tm-live-class-left">
                      <div className="tm-live-date-badge">
                        <div className="tm-live-date-month">{month}</div>
                        <div className="tm-live-date-day">{day}</div>
                      </div>

                      <div className="tm-live-details">
                        <h3>{session.title}</h3>
                        <div className="tm-live-meta-pills">
                          <span>📅 {dateFull} at {timeStr}</span>
                          <span>⏱ {session.duration_minutes || 60} mins</span>
                          <span>👤 Instructor: {session.instructor || 'Patil Trader'}</span>
                          <span>🌐 {session.platform || 'Google Meet'}</span>
                        </div>
                        {session.description && (
                          <p className="tm-live-desc">{session.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="tm-live-actions">
                      <a
                        href={session.meeting_link || 'https://meet.google.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tm-btn-meet"
                      >
                        <span>Join Google Meet</span>
                        <span aria-hidden="true">&rarr;</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ==============================================================
            TAB 3: POSTS & RESOURCES
            ============================================================== */}
        {activeTab === 'resources' && (
          <div className="tm-resources-grid">
            {resources.length === 0 ? (
              <div className="tm-empty-classroom-state" style={{ gridColumn: '1 / -1' }}>
                <h3>No Course Resources Uploaded Yet</h3>
                <p>Downloadable charts, PDF blueprints, spreadsheets, and assignments will appear here.</p>
              </div>
            ) : (
              resources.map((item) => (
                <div key={item.id} className="tm-resource-card">
                  <div>
                    <div className="tm-resource-top">
                      <span className={`tm-resource-badge ${item.resource_type || 'pdf'}`}>
                        {item.resource_type || 'PDF'}
                      </span>
                      {item.file_size && (
                        <span className="tm-resource-size">{item.file_size}</span>
                      )}
                    </div>

                    <h3 className="tm-resource-title">{item.title}</h3>
                    {item.description && (
                      <p className="tm-resource-desc">{item.description}</p>
                    )}
                  </div>

                  <a
                    href={item.resource_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={item.file_name || undefined}
                    className="tm-btn-download-resource"
                  >
                    <span>Download Material</span>
                    <span aria-hidden="true">&darr;</span>
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {/* ==============================================================
            TAB 4: ANNOUNCEMENTS
            ============================================================== */}
        {activeTab === 'announcements' && (
          <div className="tm-announcements-list">
            {announcements.length === 0 ? (
              <div className="tm-empty-classroom-state">
                <h3>No Course Announcements Yet</h3>
                <p>Course updates and important notifications from the mentor will appear here.</p>
              </div>
            ) : (
              announcements.map((item) => (
                <div key={item.id} className="tm-announce-card">
                  <div className="tm-announce-header">
                    <span className="tm-announce-category">{item.category || 'Course Update'}</span>
                    <span className="tm-announce-date">
                      {new Date(item.published_date || item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ==============================================================
            TAB 5: OVERVIEW
            ============================================================== */}
        {/* ==============================================================
            TAB 5: OVERVIEW (Dynamic Course Information from Database)
            ============================================================== */}
        {activeTab === 'overview' && (
          <div className="tm-overview-grid">
            <div className="tm-overview-main-col">
              {/* Course Banner Image */}
              {course.thumbnail && (
                <div className="tm-overview-banner-wrap">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="tm-overview-banner-img"
                    onError={(e) => {
                      e.target.src = '/1-c.jpeg';
                    }}
                  />
                </div>
              )}

              {/* Course Title & Description */}
              <div className="tm-overview-card">
                <span className="tm-overview-card-eyebrow">COURSE OVERVIEW</span>
                <h3 className="tm-overview-card-heading">{course.title}</h3>
                {course.subtitle && (
                  <div className="tm-overview-card-subtitle">{course.subtitle}</div>
                )}
                {course.description ? (
                  <p className="tm-overview-card-desc tm-overview-preline">{course.description}</p>
                ) : (
                  <p className="tm-overview-card-empty-note">
                    No course description has been published for this program yet.
                  </p>
                )}
              </div>

              {/* Course Objectives */}
              {course.objectives && (
                <div className="tm-overview-card">
                  <h3 className="tm-overview-card-title">Course Objectives</h3>
                  <p className="tm-overview-card-desc tm-overview-preline">{course.objectives}</p>
                </div>
              )}

              {/* Learning Outcomes */}
              {course.learning_outcomes && (
                <div className="tm-overview-card">
                  <h3 className="tm-overview-card-title">Learning Outcomes</h3>
                  <p className="tm-overview-card-desc tm-overview-preline">{course.learning_outcomes}</p>
                </div>
              )}

              {/* Complete Syllabus */}
              {course.syllabus && (
                <div className="tm-overview-card">
                  <h3 className="tm-overview-card-title">Complete Syllabus & Curriculum</h3>
                  <div className="tm-overview-card-desc tm-overview-preline">{course.syllabus}</div>
                </div>
              )}

              {/* Curriculum Topics Covered */}
              {topicsList.length > 0 && (
                <div className="tm-overview-card">
                  <h3 className="tm-overview-card-title">Curriculum Topics Covered</h3>
                  <div className="tm-topics-chip-grid">
                    {topicsList.map((t, idx) => (
                      <span key={idx} className="tm-topic-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Learning Methodology (when configured) */}
              {course.methodology && (
                <div className="tm-overview-card">
                  <h3 className="tm-overview-card-title">Learning Methodology</h3>
                  <p className="tm-overview-card-desc tm-overview-preline">{course.methodology}</p>
                </div>
              )}

              {/* Assignments & Practical Work (when configured) */}
              {course.assignments_info && (
                <div className="tm-overview-card">
                  <h3 className="tm-overview-card-title">Assignments & Case Studies</h3>
                  <p className="tm-overview-card-desc tm-overview-preline">{course.assignments_info}</p>
                </div>
              )}

              {/* Assessment Details (when configured) */}
              {course.assessment_info && (
                <div className="tm-overview-card">
                  <h3 className="tm-overview-card-title">Assessment & Evaluation Details</h3>
                  <p className="tm-overview-card-desc tm-overview-preline">{course.assessment_info}</p>
                </div>
              )}
            </div>

            <div className="tm-overview-side-col">
              {/* Instructor Information */}
              <div className="tm-instructor-box">
                <div className="tm-instructor-header">
                  <img
                    src={course.instructor_image || '/heroo.png'}
                    alt={course.instructor_name || 'Patil Trader'}
                    className="tm-instructor-avatar"
                    onError={(e) => {
                      e.target.src = '/heroo.png';
                    }}
                  />
                  <div className="tm-instructor-meta">
                    <h4>{course.instructor_name || 'Patil Trader'}</h4>
                    <span>Course Instructor · TRADEMAX</span>
                  </div>
                </div>
                {course.instructor_bio && (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--tm-portal-text-muted)', lineHeight: '1.5' }}>
                    {course.instructor_bio}
                  </p>
                )}
              </div>

              {/* Program Information */}
              <div className="tm-overview-card">
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 800 }}>
                  Program Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  {course.duration && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--tm-portal-text-muted)' }}>Duration</span>
                      <strong>{course.duration}</strong>
                    </div>
                  )}
                  {course.learning_mode && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--tm-portal-text-muted)' }}>Format</span>
                      <strong>{course.learning_mode}</strong>
                    </div>
                  )}
                  {course.batch_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--tm-portal-text-muted)' }}>Batch Cohort</span>
                      <strong>{course.batch_name}</strong>
                    </div>
                  )}
                  {course.level && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--tm-portal-text-muted)' }}>Level</span>
                      <strong>{course.level}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--tm-portal-text-muted)' }}>Access Status</span>
                    <strong style={{ color: '#059669' }}>Enrolled Student Access</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 6: NOTIFICATIONS
            ============================================================== */}
        {activeTab === 'notifications' && (
          <div className="tm-notifications-feed">
            {notifications.length === 0 ? (
              <div className="tm-empty-classroom-state">
                <h3>No Notifications</h3>
                <p>You are all caught up! New lectures and meeting alerts will be posted here.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`tm-notif-item ${!notif.is_read ? 'is-unread' : ''}`}
                >
                  <div className="tm-notif-meta">
                    <h4>{notif.title}</h4>
                    <p>{notif.message}</p>
                  </div>
                  <span className="tm-notif-time">
                    {new Date(notif.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseClassroom;
