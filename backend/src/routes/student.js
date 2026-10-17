import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { generatePresignedGetUrl } from '../services/s3Service.js';

export const studentRouter = Router();

// Protect all student routes with authenticated user session
studentRouter.use(authMiddleware);

/**
 * GET /api/student/dashboard
 * Aggregated dashboard payload for fast single-call portal load
 */
studentRouter.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    // 1. Fetch Student Profile
    const profileRes = await pool.query(
      `SELECT id, name, email, mobile, reference, trading_experience, role, created_at
       FROM users
       WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    const profile = profileRes.rows[0];

    // 2. Fetch Enrolled Courses with course metadata
    const enrollmentsRes = await pool.query(
      `SELECT e.id as enrollment_id,
              COALESCE(e.course_id, c.id, 1) as course_id,
              COALESCE(e.course_id, c.id, 1) as id,
              COALESCE(c.title, e.course_name) as course_title,
              COALESCE(c.subtitle, 'Forex & Crypto Trading') as course_subtitle,
              COALESCE(c.thumbnail, '/1-c.jpeg') as thumbnail,
              COALESCE(c.slug, 'trading-masterclass') as slug,
              COALESCE(c.duration, '30 Days') as duration,
              COALESCE(c.learning_mode, 'Live Online') as learning_mode,
              e.batch_name,
              e.enrollment_status,
              e.payment_status,
              e.amount_paid,
              COALESCE(e.progress_percentage, 0) as progress_percentage,
              COALESCE(e.completed_lessons, 0) as completed_lessons,
              COALESCE(e.total_lessons, 16) as total_lessons,
              e.created_at as enrolled_at
       FROM enrollments e
       LEFT JOIN courses c ON (
         e.course_id = c.id 
         OR LOWER(e.course_name) = LOWER(c.title)
         OR (c.slug = 'trading-masterclass' AND LOWER(e.course_name) LIKE '%masterclass%')
       )
       WHERE (e.user_id = $1 OR LOWER(e.email) = $2)
       ORDER BY e.created_at DESC`,
      [userId, userEmail]
    );

    // Provide authentic progress data from PostgreSQL (no hardcoded fake values)
    const enrolledCourses = enrollmentsRes.rows.map((item) => ({
      ...item,
      progress_percentage: parseInt(item.progress_percentage, 10) || 0,
      completed_lessons: parseInt(item.completed_lessons, 10) || 0,
      total_lessons: parseInt(item.total_lessons, 10) || 16,
    }));

    // 3. Fetch Upcoming Live Classes
    const liveClassesRes = await pool.query(
      `SELECT lc.id, lc.course_id, lc.title, lc.batch_name, lc.scheduled_at,
              lc.duration_minutes, lc.meeting_link, lc.platform, lc.instructor, lc.status,
              lc.description,
              c.title as course_name
       FROM live_classes lc
       LEFT JOIN courses c ON lc.course_id = c.id
       WHERE lc.status != 'cancelled'
       ORDER BY lc.scheduled_at ASC
       LIMIT 6`
    );

    // 4. Fetch Published Announcements
    const announcementsRes = await pool.query(
      `SELECT id, title, content, category, published_date, created_at
       FROM announcements
       WHERE is_published = TRUE
       ORDER BY created_at DESC
       LIMIT 6`
    );

    // 5. Activity Overview & Stats
    const totalEnrolled = enrolledCourses.length;
    const upcomingSessionsCount = liveClassesRes.rows.length;
    const avgProgress = totalEnrolled > 0
      ? Math.round(enrolledCourses.reduce((acc, c) => acc + (c.progress_percentage || 0), 0) / totalEnrolled)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        profile,
        stats: {
          totalEnrolled,
          upcomingSessionsCount,
          averageProgress: avgProgress,
        },
        enrolledCourses,
        upcomingClasses: liveClassesRes.rows,
        announcements: announcementsRes.rows,
      },
    });
  } catch (err) {
    console.error('[Student Dashboard Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve student dashboard data.',
    });
  }
});

/**
 * GET /api/student/courses
 * Fetch all published courses dynamically from PostgreSQL with enrollment status for this student
 */
studentRouter.get('/courses', async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    // Query all published courses
    const coursesRes = await pool.query(
      `SELECT id, slug, title, subtitle, description, original_price, price,
              discount_label, duration, learning_mode, batch_name, thumbnail,
              is_published, created_at
       FROM courses
       WHERE is_published = TRUE
       ORDER BY id ASC`
    );

    // Query student's enrollments to flag enrolled courses
    const studentEnrollmentsRes = await pool.query(
      `SELECT course_id, course_name, enrollment_status, created_at
       FROM enrollments
       WHERE (user_id = $1 OR LOWER(email) = $2)`,
      [userId, userEmail]
    );

    const enrolledCourseIds = new Set(
      studentEnrollmentsRes.rows
        .map((e) => e.course_id)
        .filter(Boolean)
    );
    const enrolledCourseNames = new Set(
      studentEnrollmentsRes.rows
        .map((e) => (e.course_name || '').toLowerCase().trim())
        .filter(Boolean)
    );

    const coursesWithStatus = coursesRes.rows.map((course) => {
      const isEnrolled =
        enrolledCourseIds.has(course.id) ||
        enrolledCourseNames.has(course.title.toLowerCase().trim()) ||
        (course.slug === 'trading-masterclass' && enrolledCourseNames.has('trading masterclass'));

      return {
        ...course,
        is_enrolled: Boolean(isEnrolled),
      };
    });

    return res.status(200).json({
      success: true,
      courses: coursesWithStatus,
    });
  } catch (err) {
    console.error('[Student Courses Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve courses for student portal.',
    });
  }
});

/**
 * GET /api/student/my-courses
 * Dedicated endpoint returning ONLY courses the student has successfully enrolled in
 * (Verified payment or authorized admin enrollment)
 */
studentRouter.get('/my-courses', async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    const myCoursesRes = await pool.query(
      `SELECT e.id as enrollment_id,
              e.course_id,
              c.id as course_id,
              COALESCE(c.title, e.course_name) as title,
              COALESCE(c.subtitle, 'Forex & Crypto Trading Masterclass') as subtitle,
              COALESCE(c.description, '') as description,
              COALESCE(c.thumbnail, '/1-c.jpeg') as thumbnail,
              COALESCE(c.slug, 'trading-masterclass') as slug,
              COALESCE(c.duration, '1 Month') as duration,
              COALESCE(c.level, 'Basic to Advanced') as level,
              COALESCE(c.learning_mode, 'Live Online') as learning_mode,
              e.batch_name,
              e.enrollment_status,
              e.payment_status,
              e.amount_paid,
              COALESCE(e.progress_percentage, 0) as progress_percentage,
              COALESCE(e.completed_lessons, 0) as completed_lessons,
              COALESCE(e.total_lessons, 16) as total_lessons,
              e.created_at as enrolled_at
       FROM enrollments e
       INNER JOIN courses c ON e.course_id = c.id
       WHERE (e.user_id = $1 OR LOWER(e.email) = $2)
         AND e.enrollment_status = 'enrolled'
         AND (e.payment_status = 'completed' OR e.payment_status = 'paid' OR e.amount_paid > 0)
       ORDER BY e.created_at DESC`,
      [userId, userEmail]
    );

    return res.status(200).json({
      success: true,
      courses: myCoursesRes.rows,
    });
  } catch (err) {
    console.error('[Student My Courses Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve enrolled courses.',
    });
  }
});

/**
 * GET /api/student/live-classes
 * Fetch all scheduled live classes with course details
 */
studentRouter.get('/live-classes', async (req, res) => {
  try {
    const liveClassesRes = await pool.query(
      `SELECT lc.id, lc.course_id, lc.title, lc.batch_name, lc.scheduled_at,
              lc.duration_minutes, lc.meeting_link, lc.platform, lc.instructor, lc.status,
              lc.description,
              c.title as course_name
       FROM live_classes lc
       LEFT JOIN courses c ON lc.course_id = c.id
       WHERE lc.status != 'cancelled'
       ORDER BY lc.scheduled_at ASC`
    );

    return res.status(200).json({
      success: true,
      liveClasses: liveClassesRes.rows,
    });
  } catch (err) {
    console.error('[Student Live Classes Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve live classes.',
    });
  }
});

/**
 * GET /api/student/announcements
 * Fetch all published announcements
 */
studentRouter.get('/announcements', async (req, res) => {
  try {
    const announcementsRes = await pool.query(
      `SELECT id, course_id, title, content, category, author, published_date, created_at
       FROM announcements
       WHERE is_published = TRUE
       ORDER BY created_at DESC`
    );

    return res.status(200).json({
      success: true,
      announcements: announcementsRes.rows,
    });
  } catch (err) {
    console.error('[Student Announcements Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve announcements.',
    });
  }
});

/**
 * GET /api/student/courses/:courseId/classroom
 * Dedicated classroom dashboard for an authorized course:
 * Strictly verifies enrollment authorization before returning content.
 */
studentRouter.get('/courses/:courseId/classroom', async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();
    const courseId = parseInt(req.params.courseId, 10);

    if (isNaN(courseId)) {
      return res.status(400).json({ success: false, error: 'Invalid course ID.' });
    }

    // 1. Verify Authorization (Student must have active paid/verified enrollment or be admin)
    const isAdmin = req.user.role === 'admin';
    let enrollment = null;
    let studentBatch = 'All Batches';

    if (!isAdmin) {
      const enrollCheck = await pool.query(
        `SELECT id, batch_name, enrollment_status, payment_status, progress_percentage, completed_lessons, total_lessons, created_at
         FROM enrollments
         WHERE (user_id = $1 OR LOWER(email) = $2)
           AND course_id = $3
           AND enrollment_status = 'enrolled'
           AND (payment_status = 'completed' OR payment_status = 'paid' OR amount_paid > 0)
         LIMIT 1`,
        [userId, userEmail, courseId]
      );

      if (enrollCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You are not authorized to view this course. Please enroll to access course materials.',
        });
      }
      enrollment = enrollCheck.rows[0];
      studentBatch = enrollment.batch_name || 'November';
    }

    // 2. Query Course Metadata
    const courseRes = await pool.query(
      `SELECT * FROM courses WHERE id = $1 LIMIT 1`,
      [courseId]
    );

    if (courseRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }
    const course = courseRes.rows[0];

    // 3. Query Lessons & Student Progress (Batch-filtered & Release Date checked)
    // Never expose permanent S3 keys directly to the client bundle
    const [lessonsRes, progressRes] = await Promise.all([
      isAdmin
        ? pool.query(
            `SELECT id, module_name, title, description, duration_minutes, sort_order, batch_name,
                    release_at, (s3_key IS NOT NULL OR video_url IS NOT NULL) as has_video
             FROM course_lessons
             WHERE course_id = $1
             ORDER BY sort_order ASC, id ASC`,
            [courseId]
          )
        : pool.query(
            `SELECT id, module_name, title, description, duration_minutes, sort_order, batch_name,
                    release_at, (s3_key IS NOT NULL OR video_url IS NOT NULL) as has_video
             FROM course_lessons
             WHERE course_id = $1
               AND is_published = TRUE
               AND (batch_name = $2 OR batch_name = 'All Batches' OR batch_name IS NULL)
               AND (release_at IS NULL OR release_at <= CURRENT_TIMESTAMP)
             ORDER BY sort_order ASC, id ASC`,
            [courseId, studentBatch]
          ),
      pool.query(
        `SELECT lesson_id, is_completed, completed_at
         FROM lesson_progress
         WHERE user_id = $1 AND course_id = $2`,
        [userId, courseId]
      ),
    ]);

    const completedLessonIds = new Set(
      progressRes.rows.filter((p) => p.is_completed).map((p) => p.lesson_id)
    );

    const lessons = lessonsRes.rows.map((l) => ({
      ...l,
      is_completed: completedLessonIds.has(l.id),
    }));

    // 4. Query Upcoming Live Classes for THIS Course (Batch Restricted)
    const liveClassesRes = await pool.query(
      isAdmin
        ? `SELECT id, title, batch_name, scheduled_at, duration_minutes, meeting_link, platform, instructor, instructions, status, description
           FROM live_classes
           WHERE course_id = $1 AND status != 'cancelled'
           ORDER BY scheduled_at ASC`
        : `SELECT id, title, batch_name, scheduled_at, duration_minutes, meeting_link, platform, instructor, instructions, status, description
           FROM live_classes
           WHERE course_id = $1 AND status != 'cancelled'
             AND (batch_name = $2 OR batch_name = 'All Batches' OR batch_name IS NULL)
           ORDER BY scheduled_at ASC`,
      isAdmin ? [courseId] : [courseId, studentBatch]
    );

    // 5. Query Course-Specific Announcements (Batch Restricted)
    const announcementsRes = await pool.query(
      isAdmin
        ? `SELECT id, title, batch_name, content, category, author, is_pinned, published_date, created_at
           FROM announcements
           WHERE (course_id = $1 OR course_id IS NULL)
           ORDER BY is_pinned DESC, created_at DESC
           LIMIT 15`
        : `SELECT id, title, batch_name, content, category, author, is_pinned, published_date, created_at
           FROM announcements
           WHERE (course_id = $1 OR course_id IS NULL)
             AND is_published = TRUE
             AND (batch_name = $2 OR batch_name = 'All Batches' OR batch_name IS NULL)
             AND (scheduled_at IS NULL OR scheduled_at <= CURRENT_TIMESTAMP)
           ORDER BY is_pinned DESC, created_at DESC
           LIMIT 15`,
      isAdmin ? [courseId] : [courseId, studentBatch]
    );

    // 6. Query Course Posts, Notes, PDFs & Assignments (Batch Restricted)
    const resourcesRes = await pool.query(
      isAdmin
        ? `SELECT id, title, batch_name, description, resource_type, resource_url, s3_key, file_name, file_size, created_at
           FROM course_resources
           WHERE course_id = $1
           ORDER BY created_at DESC`
        : `SELECT id, title, batch_name, description, resource_type, resource_url, file_name, file_size, created_at
           FROM course_resources
           WHERE course_id = $1
             AND (batch_name = $2 OR batch_name = 'All Batches' OR batch_name IS NULL)
             AND (is_published IS TRUE OR is_published IS NULL)
           ORDER BY created_at DESC`,
      isAdmin ? [courseId] : [courseId, studentBatch]
    );

    // 7. Query Course Notifications (Batch Restricted)
    const notificationsRes = await pool.query(
      isAdmin
        ? `SELECT id, title, batch_name, message, type, is_read, created_at
           FROM course_notifications
           WHERE course_id = $1
           ORDER BY created_at DESC
           LIMIT 20`
        : `SELECT id, title, batch_name, message, type, is_read, created_at
           FROM course_notifications
           WHERE course_id = $1
             AND (user_id = $2 OR user_id IS NULL)
             AND (batch_name = $3 OR batch_name = 'All Batches' OR batch_name IS NULL)
           ORDER BY created_at DESC
           LIMIT 20`,
      isAdmin ? [courseId] : [courseId, userId, studentBatch]
    );

    // 8. Calculate dynamic progress stats
    const totalLessons = lessons.length;
    const completedLessons = completedLessonIds.size;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        course,
        studentBatch,
        enrollment: enrollment || {
          progress_percentage: progressPercentage,
          completed_lessons: completedLessons,
          total_lessons: totalLessons,
        },
        stats: {
          totalLessons,
          completedLessons,
          progressPercentage,
        },
        lessons,
        liveClasses: liveClassesRes.rows,
        announcements: announcementsRes.rows,
        resources: resourcesRes.rows,
        notifications: notificationsRes.rows,
      },
    });
  } catch (err) {
    console.error('[Student Classroom Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve course classroom data.',
    });
  }
});

/**
 * POST /api/student/courses/:courseId/lessons/:lessonId/playback-url
 * GET  /api/student/courses/:courseId/lessons/:lessonId/playback-url
 * Secure video playback authorization:
 * Generates short-lived (15 min) S3 presigned GET URL after strictly verifying:
 * 1. User authentication
 * 2. Active, paid course enrollment
 * 3. Batch matching (Section 13: BATCH-BASED ACCESS CONTROL)
 * 4. Lesson publication status & release date
 */
const handlePlaybackUrlRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();
    const courseId = parseInt(req.params.courseId, 10);
    const lessonId = parseInt(req.params.lessonId, 10);

    if (isNaN(courseId) || isNaN(lessonId)) {
      return res.status(400).json({ success: false, error: 'Invalid parameters.' });
    }

    const isAdmin = req.user.role === 'admin';
    let studentBatch = 'All Batches';

    // 1. Enrollment Verification
    if (!isAdmin) {
      const enrollCheck = await pool.query(
        `SELECT id, batch_name, enrollment_status, payment_status, amount_paid
         FROM enrollments
         WHERE (user_id = $1 OR LOWER(email) = $2)
           AND course_id = $3
           AND enrollment_status = 'enrolled'
           AND (payment_status = 'completed' OR payment_status = 'paid' OR amount_paid > 0)
         LIMIT 1`,
        [userId, userEmail, courseId]
      );

      if (enrollCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You must be actively enrolled in this course to view recorded lessons.',
        });
      }

      studentBatch = enrollCheck.rows[0].batch_name || 'November';
    }

    // 2. Lesson Query
    const lessonRes = await pool.query(
      `SELECT id, course_id, title, description, s3_key, video_url, content_type,
              batch_name, release_at, is_published
       FROM course_lessons
       WHERE id = $1 AND course_id = $2
       LIMIT 1`,
      [lessonId, courseId]
    );

    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Video lesson not found.' });
    }

    const lesson = lessonRes.rows[0];

    // 3. Authorization Checks (Publication & Release Date)
    if (!isAdmin) {
      if (!lesson.is_published) {
        return res.status(403).json({
          success: false,
          error: 'This lesson is currently unpublished.',
        });
      }

      if (lesson.release_at && new Date(lesson.release_at) > new Date()) {
        return res.status(403).json({
          success: false,
          error: `This lesson is scheduled to be released on ${new Date(lesson.release_at).toLocaleString()}.`,
        });
      }

      // 4. Batch-Based Access Control (Section 13)
      if (
        lesson.batch_name &&
        lesson.batch_name !== 'All Batches' &&
        studentBatch !== 'All Batches' &&
        lesson.batch_name.toLowerCase().trim() !== studentBatch.toLowerCase().trim()
      ) {
        return res.status(403).json({
          success: false,
          error: `Access restricted. This lesson is designated for the ${lesson.batch_name} batch. Your enrolled batch is ${studentBatch}.`,
        });
      }
    }

    // 5. Generate Short-Lived S3 Presigned GET URL (15 minutes / 900 seconds)
    if (lesson.s3_key) {
      const playbackUrl = await generatePresignedGetUrl({
        key: lesson.s3_key,
        contentType: lesson.content_type || 'video/mp4',
        expiresIn: 900,
      });

      return res.status(200).json({
        success: true,
        playbackUrl,
        expiresIn: 900,
        lessonId: lesson.id,
        title: lesson.title,
      });
    } else if (lesson.video_url) {
      // Legacy embed or external stream link fallback
      return res.status(200).json({
        success: true,
        playbackUrl: lesson.video_url,
        isDirect: true,
        lessonId: lesson.id,
        title: lesson.title,
      });
    }

    return res.status(404).json({
      success: false,
      error: 'No media file is attached to this lesson record.',
    });
  } catch (err) {
    console.error('[Student Playback URL Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate secure video playback URL.',
    });
  }
};

studentRouter.post('/courses/:courseId/lessons/:lessonId/playback-url', handlePlaybackUrlRequest);
studentRouter.get('/courses/:courseId/lessons/:lessonId/playback-url', handlePlaybackUrlRequest);

/**
 * Universal video playback endpoint: POST /api/student/videos/:videoId/playback-url
 */
studentRouter.post('/videos/:videoId/playback-url', async (req, res) => {
  const lessonId = parseInt(req.params.videoId, 10);
  if (isNaN(lessonId)) {
    return res.status(400).json({ success: false, error: 'Invalid video ID.' });
  }
  const lRes = await pool.query('SELECT course_id FROM course_lessons WHERE id = $1', [lessonId]);
  if (lRes.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Video not found.' });
  }
  req.params.courseId = lRes.rows[0].course_id;
  req.params.lessonId = lessonId;
  return handlePlaybackUrlRequest(req, res);
});

/**
 * POST /api/student/courses/:courseId/lessons/:lessonId/progress
 * Toggle or update lesson completion status and recalculate course progress
 */
studentRouter.post('/courses/:courseId/lessons/:lessonId/progress', async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();
    const courseId = parseInt(req.params.courseId, 10);
    const lessonId = parseInt(req.params.lessonId, 10);
    const { is_completed = true } = req.body;

    if (isNaN(courseId) || isNaN(lessonId)) {
      return res.status(400).json({ success: false, error: 'Invalid parameters.' });
    }

    // Verify enrollment
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) {
      const enrollCheck = await pool.query(
        `SELECT id FROM enrollments
         WHERE (user_id = $1 OR LOWER(email) = $2)
           AND course_id = $3
           AND enrollment_status = 'enrolled'
         LIMIT 1`,
        [userId, userEmail, courseId]
      );

      if (enrollCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Not authorized for this course.' });
      }
    }

    // Update lesson_progress record
    if (is_completed) {
      await pool.query(
        `INSERT INTO lesson_progress (user_id, course_id, lesson_id, is_completed, completed_at)
         VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, lesson_id)
         DO UPDATE SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP`,
        [userId, courseId, lessonId]
      );
    } else {
      await pool.query(
        `DELETE FROM lesson_progress WHERE user_id = $1 AND lesson_id = $2`,
        [userId, lessonId]
      );
    }

    // Recalculate course completion progress
    const [totalLessonsRes, completedRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM course_lessons WHERE course_id = $1 AND is_published = TRUE`, [courseId]),
      pool.query(`SELECT COUNT(*) as count FROM lesson_progress WHERE user_id = $1 AND course_id = $2 AND is_completed = TRUE`, [userId, courseId]),
    ]);

    const totalLessons = parseInt(totalLessonsRes.rows[0].count, 10) || 1;
    const completedLessons = parseInt(completedRes.rows[0].count, 10) || 0;
    const progressPercentage = Math.min(100, Math.round((completedLessons / totalLessons) * 100));

    // Update enrollment table
    await pool.query(
      `UPDATE enrollments
       SET progress_percentage = $1, completed_lessons = $2, total_lessons = $3, updated_at = CURRENT_TIMESTAMP
       WHERE (user_id = $4 OR LOWER(email) = $5) AND course_id = $6`,
      [progressPercentage, completedLessons, totalLessons, userId, userEmail, courseId]
    );

    return res.status(200).json({
      success: true,
      stats: {
        is_completed: Boolean(is_completed),
        progressPercentage,
        completedLessons,
        totalLessons,
      },
    });
  } catch (err) {
    console.error('[Lesson Progress Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update lesson progress.',
    });
  }
});

/**
 * POST /api/student/notifications/:id/read
 * Mark a course notification as read
 */
studentRouter.post('/notifications/:id/read', async (req, res) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    if (!isNaN(notifId)) {
      await pool.query(`UPDATE course_notifications SET is_read = TRUE WHERE id = $1`, [notifId]);
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Notification Read Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark notification as read.' });
  }
});
