import { Router } from 'express';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

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
              e.course_id,
              COALESCE(c.title, e.course_name) as course_title,
              COALESCE(c.subtitle, 'Forex & Crypto Trading') as course_subtitle,
              COALESCE(c.thumbnail, '/1-c.jpeg') as thumbnail,
              COALESCE(c.slug, 'trading-masterclass') as slug,
              COALESCE(c.duration, '1 Month') as duration,
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
       LEFT JOIN courses c ON e.course_id = c.id
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
 * GET /api/student/live-classes
 * Fetch all scheduled live classes dynamically from PostgreSQL
 */
studentRouter.get('/live-classes', async (req, res) => {
  try {
    const classesRes = await pool.query(
      `SELECT lc.id, lc.course_id, lc.title, lc.batch_name, lc.scheduled_at,
              lc.duration_minutes, lc.meeting_link, lc.platform, lc.instructor, lc.status,
              c.title as course_name
       FROM live_classes lc
       LEFT JOIN courses c ON lc.course_id = c.id
       ORDER BY lc.scheduled_at ASC`
    );

    return res.status(200).json({
      success: true,
      liveClasses: classesRes.rows,
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
 * Fetch all announcements dynamically from PostgreSQL
 */
studentRouter.get('/announcements', async (req, res) => {
  try {
    const announcementsRes = await pool.query(
      `SELECT id, title, content, category, published_date, is_published, created_at
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
