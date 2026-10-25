import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  generatePresignedGetUrl,
  generatePresignedDownloadUrl,
  getS3ObjectStream,
  uploadObjectToS3,
  getMimeType,
  formatContentDisposition,
} from '../services/s3Service.js';
import { getPrivateScreenshotFilePath } from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

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

    // 2. Fetch Enrolled Courses with course metadata (Verified Active Enrollments Only)
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
              'ENROLLED' as status,
              FALSE as is_in_process,
              TRUE as access_granted,
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
         AND e.enrollment_status = 'enrolled'
         AND (e.payment_status = 'completed' OR e.payment_status = 'paid' OR e.amount_paid > 0)
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

    // Fetch Pending In-Process Payment Claims (where student does not have verified enrollment)
    const pendingClaimsRes = await pool.query(
      `SELECT mpc.id as claim_id_pk,
              mpc.claim_id,
              mpc.course_id,
              mpc.course_id as id,
              c.title as course_title,
              COALESCE(c.subtitle, 'Forex & Crypto Trading') as course_subtitle,
              COALESCE(c.thumbnail, '/1-c.jpeg') as thumbnail,
              COALESCE(c.slug, 'trading-masterclass') as slug,
              'IN PROCESS' as status,
              TRUE as is_in_process,
              FALSE as access_granted,
              mpc.status as claim_status,
              mpc.amount as amount_paid,
              mpc.transaction_ref,
              'Your payment is in process. Your course access will be activated after admin verification.' as process_note,
              mpc.created_at as enrolled_at
       FROM manual_payment_claims mpc
       INNER JOIN courses c ON mpc.course_id = c.id
       WHERE mpc.user_id = $1
         AND mpc.status IN ('PENDING', 'UNDER_REVIEW')
         AND NOT EXISTS (
           SELECT 1 FROM enrollments e
           WHERE (e.user_id = $1 OR LOWER(e.email) = $2)
             AND (e.course_id = mpc.course_id OR LOWER(e.course_name) = LOWER(c.title))
             AND e.enrollment_status = 'enrolled'
             AND (e.payment_status = 'completed' OR e.payment_status = 'paid' OR e.amount_paid > 0)
         )
       ORDER BY mpc.created_at DESC`,
      [userId, userEmail]
    );
    const pendingCourses = pendingClaimsRes.rows;

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

    // 5. Activity Overview & Stats (Verified enrollments only)
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
        pendingCourses,
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
 * Fetch all published courses dynamically with verified enrollment status and in-process status
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

    // Query student's verified enrollments
    const studentEnrollmentsRes = await pool.query(
      `SELECT course_id, course_name, enrollment_status, created_at
       FROM enrollments
       WHERE (user_id = $1 OR LOWER(email) = $2)
         AND enrollment_status = 'enrolled'
         AND (payment_status = 'completed' OR payment_status = 'paid' OR amount_paid > 0)`,
      [userId, userEmail]
    );

    // Query student's pending payment claims
    const pendingClaimsRes = await pool.query(
      `SELECT course_id, claim_id, status, created_at
       FROM manual_payment_claims
       WHERE user_id = $1 AND status IN ('PENDING', 'UNDER_REVIEW')`,
      [userId]
    );

    // Query student's rejected claims
    const rejectedClaimsRes = await pool.query(
      `SELECT course_id, claim_id, status, rejection_reason, created_at
       FROM manual_payment_claims
       WHERE user_id = $1 AND status = 'REJECTED'`,
      [userId]
    );

    const enrolledCourseIds = new Set(
      studentEnrollmentsRes.rows.map((e) => e.course_id).filter(Boolean)
    );
    const enrolledCourseNames = new Set(
      studentEnrollmentsRes.rows.map((e) => (e.course_name || '').toLowerCase().trim()).filter(Boolean)
    );

    const pendingCourseIds = new Set(
      pendingClaimsRes.rows.map((p) => p.course_id).filter(Boolean)
    );
    const rejectedCourseIds = new Set(
      rejectedClaimsRes.rows.map((r) => r.course_id).filter(Boolean)
    );

    const coursesWithStatus = coursesRes.rows.map((course) => {
      const isEnrolled =
        enrolledCourseIds.has(course.id) ||
        enrolledCourseNames.has(course.title.toLowerCase().trim()) ||
        (course.slug === 'trading-masterclass' && enrolledCourseNames.has('trading masterclass'));

      const isInProcess = !isEnrolled && pendingCourseIds.has(course.id);
      const isRejected = !isEnrolled && !isInProcess && rejectedCourseIds.has(course.id);

      return {
        ...course,
        is_enrolled: Boolean(isEnrolled),
        is_in_process: Boolean(isInProcess),
        is_rejected: Boolean(isRejected),
        status: isEnrolled ? 'ENROLLED' : (isInProcess ? 'IN PROCESS' : (isRejected ? 'PAYMENT REJECTED' : 'AVAILABLE')),
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
 * Dedicated endpoint returning courses the student has actively enrolled in
 * OR submitted payment proof for (which shows "IN PROCESS")
 */
studentRouter.get('/my-courses', async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = (req.user.email || '').toLowerCase().trim();

    // 1. Fetch Verified Active Enrollments
    const verifiedRes = await pool.query(
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
              'ENROLLED' as status,
              FALSE as is_in_process,
              FALSE as is_rejected,
              TRUE as access_granted,
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

    const verifiedCourses = verifiedRes.rows;
    const verifiedCourseIds = new Set(verifiedCourses.map((r) => r.course_id));

    // 2. Fetch Pending and Rejected Claims (where user is not already enrolled)
    const claimsRes = await pool.query(
      `SELECT mpc.id as claim_id_pk,
              mpc.claim_id,
              mpc.course_id,
              c.id as course_id,
              c.title,
              COALESCE(c.subtitle, 'Forex & Crypto Trading Masterclass') as subtitle,
              COALESCE(c.description, '') as description,
              COALESCE(c.thumbnail, '/1-c.jpeg') as thumbnail,
              COALESCE(c.slug, 'trading-masterclass') as slug,
              COALESCE(c.duration, '1 Month') as duration,
              COALESCE(c.level, 'Basic to Advanced') as level,
              COALESCE(c.learning_mode, 'Live Online') as learning_mode,
              COALESCE(c.batch_name, 'November') as batch_name,
              mpc.status as claim_status,
              mpc.transaction_ref,
              mpc.amount as amount_paid,
              mpc.rejection_reason,
              mpc.created_at as enrolled_at
       FROM manual_payment_claims mpc
       INNER JOIN courses c ON mpc.course_id = c.id
       WHERE mpc.user_id = $1
         AND mpc.status IN ('PENDING', 'UNDER_REVIEW', 'REJECTED')
       ORDER BY mpc.created_at DESC`,
      [userId]
    );

    // Map unverified claims into courses list
    const unverifiedCourses = [];
    const processedCourseIds = new Set(verifiedCourseIds);

    for (const row of claimsRes.rows) {
      if (processedCourseIds.has(row.course_id)) {
        continue;
      }
      processedCourseIds.add(row.course_id);

      const isPending = row.claim_status === 'PENDING' || row.claim_status === 'UNDER_REVIEW';
      const isRejected = row.claim_status === 'REJECTED';

      unverifiedCourses.push({
        enrollment_id: null,
        course_id: row.course_id,
        id: row.course_id,
        title: row.title,
        subtitle: row.subtitle,
        description: row.description,
        thumbnail: row.thumbnail,
        slug: row.slug,
        duration: row.duration,
        level: row.level,
        learning_mode: row.learning_mode,
        batch_name: row.batch_name,
        enrollment_status: isPending ? 'pending' : 'rejected',
        payment_status: isPending ? 'pending' : 'rejected',
        status: isPending ? 'IN PROCESS' : 'PAYMENT REJECTED',
        is_in_process: isPending,
        is_rejected: isRejected,
        access_granted: false,
        claim_id: row.claim_id,
        claim_status: row.claim_status,
        transaction_ref: row.transaction_ref,
        amount_paid: row.amount_paid,
        rejection_reason: row.rejection_reason,
        process_note: isPending
          ? 'Your payment is in process. Your course access will be activated after admin verification.'
          : (row.rejection_reason ? `Payment rejected: ${row.rejection_reason}` : 'Your payment could not be verified. Please resubmit valid proof.'),
        can_resubmit: isRejected,
        progress_percentage: 0,
        completed_lessons: 0,
        total_lessons: 16,
        enrolled_at: row.enrolled_at,
      });
    }

    return res.status(200).json({
      success: true,
      courses: [...verifiedCourses, ...unverifiedCourses],
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
        // Check if student has an active in-process payment claim
        const claimCheck = await pool.query(
          `SELECT claim_id, status FROM manual_payment_claims
           WHERE user_id = $1 AND course_id = $2 AND status IN ('PENDING', 'UNDER_REVIEW')
           LIMIT 1`,
          [userId, courseId]
        );
        if (claimCheck.rows.length > 0) {
          return res.status(403).json({
            success: false,
            isPending: true,
            claimId: claimCheck.rows[0].claim_id,
            error: 'Access denied. Your payment is in process and awaiting administrator verification. Your course access will be activated after admin verification.',
          });
        }

        const rejCheck = await pool.query(
          `SELECT claim_id, rejection_reason FROM manual_payment_claims
           WHERE user_id = $1 AND course_id = $2 AND status = 'REJECTED'
           LIMIT 1`,
          [userId, courseId]
        );
        if (rejCheck.rows.length > 0) {
          return res.status(403).json({
            success: false,
            isRejected: true,
            claimId: rejCheck.rows[0].claim_id,
            error: `Access denied. Your payment claim was rejected: ${rejCheck.rows[0].rejection_reason || 'Could not verify payment'}. Please review and resubmit your payment evidence.`,
          });
        }

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
                    release_at, availability_days, expires_at,
                    (s3_key IS NOT NULL OR video_url IS NOT NULL) as has_video
             FROM course_lessons
             WHERE course_id = $1
             ORDER BY sort_order ASC, id ASC`,
            [courseId]
          )
        : pool.query(
            `SELECT id, module_name, title, description, duration_minutes, sort_order, batch_name,
                    release_at, availability_days, expires_at,
                    (s3_key IS NOT NULL OR video_url IS NOT NULL) as has_video
             FROM course_lessons
             WHERE course_id = $1
               AND is_published = TRUE
               AND (batch_name = $2 OR batch_name = 'All Batches' OR batch_name IS NULL)
               AND (release_at IS NULL OR release_at <= CURRENT_TIMESTAMP)
               AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
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
        ? `SELECT id, title, batch_name, description, resource_type, resource_url, s3_key, file_name, file_size, content_type, created_at
           FROM course_resources
           WHERE course_id = $1
           ORDER BY created_at DESC`
        : `SELECT id, title, batch_name, description, resource_type, resource_url, s3_key, file_name, file_size, content_type, created_at
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
              batch_name, release_at, expires_at, is_published
       FROM course_lessons
       WHERE id = $1 AND course_id = $2
       LIMIT 1`,
      [lessonId, courseId]
    );

    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Video lesson not found.' });
    }

    const lesson = lessonRes.rows[0];

    // 3. Authorization Checks (Publication, Release Date & Video Expiry)
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

      // Check Video Availability Duration Expiry
      if (lesson.expires_at && new Date(lesson.expires_at) <= new Date()) {
        return res.status(403).json({
          success: false,
          error: `This video lesson expired on ${new Date(lesson.expires_at).toLocaleDateString()} and is no longer available.`,
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

/**
 * GET /api/student/payment-claims
 * Returns all payment claims submitted by the authenticated student (IDOR protected)
 */
studentRouter.get('/payment-claims', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT mpc.id, mpc.claim_id, mpc.course_id, mpc.amount, mpc.currency,
              mpc.transaction_ref, mpc.status, mpc.rejection_reason,
              mpc.admin_notes, mpc.created_at, mpc.updated_at, mpc.reviewed_at,
              c.title as course_title, c.slug as course_slug, c.thumbnail as course_thumbnail,
              c.batch_name
       FROM manual_payment_claims mpc
       INNER JOIN courses c ON mpc.course_id = c.id
       WHERE mpc.user_id = $1
       ORDER BY mpc.created_at DESC`,
      [userId]
    );

    const claims = result.rows.map((row) => {
      const rawRef = row.transaction_ref || '';
      const maskedRef = rawRef.length > 4 ? `••••••••${rawRef.slice(-4)}` : rawRef;

      let nextAction = 'Awaiting verification by admissions admin';
      if (row.status === 'UNDER_REVIEW') {
        nextAction = 'Claim is currently under active review';
      } else if (row.status === 'APPROVED') {
        nextAction = 'Course access granted. Access classroom in portal.';
      } else if (row.status === 'REJECTED') {
        nextAction = 'Claim rejected. Review reason and resubmit valid evidence.';
      }

      return {
        ...row,
        masked_transaction_ref: maskedRef,
        next_action: nextAction,
        can_resubmit: row.status === 'REJECTED',
      };
    });

    return res.status(200).json({
      success: true,
      claims,
    });
  } catch (err) {
    console.error('[Student Claims List Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment history.',
    });
  }
});

/**
 * GET /api/student/payment-claims/:id/screenshot
 * Securely stream payment screenshot to the owning student (IDOR protected)
 */
studentRouter.get('/payment-claims/:id/screenshot', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const claimRes = await pool.query(
      `SELECT screenshot_path, screenshot_mime_type, user_id
       FROM manual_payment_claims
       WHERE (id::text = $1 OR claim_id = $1)
       LIMIT 1`,
      [id]
    );

    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment claim not found.' });
    }

    const claim = claimRes.rows[0];

    // Enforce IDOR protection: only owner student or admin can access
    if (claim.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized to view this screenshot.' });
    }

    const filePath = getPrivateScreenshotFilePath(claim.screenshot_path);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Screenshot file not found on server.' });
    }

    res.setHeader('Content-Type', claim.screenshot_mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, no-store');
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[Student Screenshot Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to load screenshot.' });
  }
});

/**
 * GET /api/student/courses/:courseId/resources/:resourceId/download
 * Secure, authenticated download endpoint for enrolled students and admins
 */
studentRouter.get('/courses/:courseId/resources/:resourceId/download', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const courseId = parseInt(req.params.courseId, 10);
    const resourceId = parseInt(req.params.resourceId, 10);

    if (isNaN(courseId) || isNaN(resourceId)) {
      return res.status(400).json({ success: false, error: 'Invalid course or resource identifier.' });
    }

    // 1. Check Course Enrollment & Batch Authorization (Students only)
    let studentBatch = 'All Batches';
    if (!isAdmin) {
      const userEmail = (req.user.email || '').toLowerCase().trim();
      const enrollRes = await pool.query(
        `SELECT id, batch_name, enrollment_status, payment_status
         FROM enrollments
         WHERE (user_id = $1 OR LOWER(email) = $2)
           AND course_id = $3
           AND enrollment_status = 'enrolled'
         LIMIT 1`,
        [userId, userEmail, courseId]
      );

      if (enrollRes.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You must be actively enrolled in this course to download materials.',
        });
      }
      studentBatch = enrollRes.rows[0].batch_name || 'All Batches';
    }

    // 2. Query the requested course resource
    const resourceRes = await pool.query(
      `SELECT * FROM course_resources WHERE id = $1 AND course_id = $2 LIMIT 1`,
      [resourceId, courseId]
    );

    if (resourceRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'The requested course material could not be found.',
      });
    }

    const resource = resourceRes.rows[0];

    // 3. Verify Batch Assignment & Publication Status (Students only)
    if (!isAdmin) {
      if (resource.is_published === false) {
        return res.status(403).json({
          success: false,
          error: 'This material is not yet published.',
        });
      }

      if (
        resource.batch_name &&
        resource.batch_name !== 'All Batches' &&
        resource.batch_name !== studentBatch
      ) {
        return res.status(403).json({
          success: false,
          error: `This material is reserved for students in batch "${resource.batch_name}".`,
        });
      }
    }

    const fileName = resource.file_name || `${resource.title || 'course-material'}.pdf`;
    const mimeType = resource.content_type || getMimeType(fileName);

    const isInline = req.query.inline === 'true' || req.query.view === 'true';
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const effectiveMimeType = isPdf ? 'application/pdf' : mimeType;
    const dispositionType = isInline ? 'inline' : 'attachment';

    // 4. Case A: Stored in AWS S3
    if (resource.s3_key) {
      if (req.query.stream === 'true' || req.query.proxy === 'true') {
        try {
          const range = req.headers.range;
          const s3Obj = await getS3ObjectStream({ key: resource.s3_key, range });
          res.setHeader('Content-Type', effectiveMimeType);
          res.setHeader('Content-Disposition', formatContentDisposition(fileName, dispositionType));
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'private, max-age=3600');
          if (s3Obj.ContentRange) {
            res.status(206);
            res.setHeader('Content-Range', s3Obj.ContentRange);
          }
          if (s3Obj.ContentLength) res.setHeader('Content-Length', s3Obj.ContentLength);
          if (s3Obj.ETag) res.setHeader('ETag', s3Obj.ETag);
          return s3Obj.Body.pipe(res);
        } catch (streamErr) {
          console.warn('[Student S3 Stream Warning - fallback to presigned redirect]:', streamErr.message);
        }
      }

      const activeUrl = await generatePresignedDownloadUrl({
        key: resource.s3_key,
        filename: fileName,
        contentType: effectiveMimeType,
        dispositionType,
        expiresIn: 900, // 15 mins
      });

      let downloadUrl = activeUrl;
      let viewUrl = activeUrl;
      if (isInline) {
        downloadUrl = await generatePresignedDownloadUrl({
          key: resource.s3_key,
          filename: fileName,
          contentType: effectiveMimeType,
          dispositionType: 'attachment',
          expiresIn: 900,
        });
      } else {
        viewUrl = await generatePresignedDownloadUrl({
          key: resource.s3_key,
          filename: fileName,
          contentType: effectiveMimeType,
          dispositionType: 'inline',
          expiresIn: 900,
        });
      }

      const streamUrl = `/api/student/courses/${courseId}/resources/${resource.id}/view?stream=true`;

      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          url: isInline ? viewUrl : downloadUrl,
          viewUrl,
          downloadUrl,
          streamUrl,
          fileName,
          fileSize: resource.file_size,
          contentType: effectiveMimeType,
          isPdf,
          isInline,
        });
      }

      return res.redirect(302, isInline ? viewUrl : downloadUrl);
    }

    // 5. Case B: Stored Locally on Disk
    if (resource.resource_url && resource.resource_url.startsWith('/uploads/')) {
      const filePath = path.resolve(uploadDir, path.basename(resource.resource_url));
      if (fs.existsSync(filePath)) {
        // Opportunistic upload to S3 if reachable
        try {
          const s3Key = `courses/${courseId}/resources/${resource.id}/${encodeURIComponent(fileName)}`;
          const fileStat = fs.statSync(filePath);
          const fileStream = fs.createReadStream(filePath);
          await uploadObjectToS3({
            key: s3Key,
            body: fileStream,
            contentType: effectiveMimeType,
            contentLength: fileStat.size,
          });
          await pool.query(
            'UPDATE course_resources SET s3_key = $1, content_type = $2 WHERE id = $3',
            [s3Key, effectiveMimeType, resource.id]
          );
          resource.s3_key = s3Key;

          const viewUrl = await generatePresignedDownloadUrl({
            key: s3Key,
            filename: fileName,
            contentType: effectiveMimeType,
            dispositionType: 'inline',
            expiresIn: 900,
          });
          const downloadUrl = await generatePresignedDownloadUrl({
            key: s3Key,
            filename: fileName,
            contentType: effectiveMimeType,
            dispositionType: 'attachment',
            expiresIn: 900,
          });

          if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
            return res.json({
              success: true,
              url: isInline ? viewUrl : downloadUrl,
              viewUrl,
              downloadUrl,
              fileName,
              fileSize: resource.file_size,
              contentType: effectiveMimeType,
              isPdf,
              isInline,
            });
          }

          return res.redirect(302, isInline ? viewUrl : downloadUrl);
        } catch (s3Err) {
          // Fall back to direct local file stream
        }

        res.setHeader('Content-Type', effectiveMimeType);
        res.setHeader('Content-Disposition', formatContentDisposition(fileName, dispositionType));
        const stat = fs.statSync(filePath);
        res.setHeader('Content-Length', stat.size);
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // 6. Case C: External URL (e.g. Google Drive / OneDrive)
    if (resource.resource_url && /^https?:\/\//i.test(resource.resource_url)) {
      if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          url: resource.resource_url,
          viewUrl: resource.resource_url,
          downloadUrl: resource.resource_url,
          fileName,
          isExternal: true,
          isPdf,
          isInline,
        });
      }
      return res.redirect(302, resource.resource_url);
    }

    return res.status(404).json({
      success: false,
      error: 'The requested course material file is not available on the storage server.',
    });
  } catch (err) {
    console.error('[Student Resource Download Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to process material download request.' });
  }
});

/**
 * GET /api/student/courses/:courseId/resources/:resourceId/view
 * Dedicated view endpoint for in-app inline PDF preview
 */
studentRouter.get('/courses/:courseId/resources/:resourceId/view', async (req, res, next) => {
  req.query.inline = 'true';
  const downloadHandler = studentRouter.stack.find(
    (layer) => layer.route?.path === '/courses/:courseId/resources/:resourceId/download'
  )?.route?.stack?.[0]?.handle;
  if (downloadHandler) {
    return downloadHandler(req, res, next);
  }
  return res.redirect(307, `/api/student/courses/${req.params.courseId}/resources/${req.params.resourceId}/download?inline=true`);
});

/**
 * GET /api/student/courses/:courseId/resources/:resourceId/download-url
 * Explicit JSON metadata & download URL retrieval
 */
studentRouter.get('/courses/:courseId/resources/:resourceId/download-url', async (req, res) => {
  req.query.json = 'true';
  const downloadHandler = studentRouter.stack.find(
    (layer) => layer.route?.path === '/courses/:courseId/resources/:resourceId/download'
  )?.route?.stack?.[0]?.handle;
  if (downloadHandler) {
    return downloadHandler(req, res);
  }
  return res.redirect(307, `/api/student/courses/${req.params.courseId}/resources/${req.params.resourceId}/download?json=true`);
});

