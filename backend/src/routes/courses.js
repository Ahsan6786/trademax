import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export const coursesRouter = Router();

const VALID_EXPERIENCES = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];
const VALID_INTERESTS = ['Forex', 'Crypto', 'Both'];

/**
 * Helper to optionally extract authenticated user from token
 */
const getOptionalUser = (req) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) return null;

    const secret = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
};

/**
 * GET /api/courses
 * Fetch all published courses for public display
 */
coursesRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM courses
       WHERE is_published = TRUE
       ORDER BY id ASC`
    );

    return res.status(200).json({
      success: true,
      courses: result.rows,
    });
  } catch (err) {
    console.error('[Get Courses Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve courses.',
    });
  }
});

/**
 * GET /api/courses/settings
 * Fetch public course settings (batch, announcement, seats visibility, contact)
 */
coursesRouter.get('/settings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT course_slug, batch_name, seats_available, show_seat_count, announcement_text, contact_phone
       FROM course_settings
       WHERE course_slug = 'trading-masterclass'
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        settings: {
          batchName: 'November',
          seatsAvailable: 15,
          showSeatCount: false,
          announcementText: 'November Batch — Limited Seats Available',
          contactPhone: '8799026206',
        },
      });
    }

    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      settings: {
        batchName: row.batch_name,
        seatsAvailable: row.seats_available,
        showSeatCount: row.show_seat_count,
        announcementText: row.announcement_text,
        contactPhone: row.contact_phone || '8799026206',
      },
    });
  } catch (err) {
    console.error('[Course Settings Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve course settings.',
    });
  }
});

/**
 * POST /api/courses/enroll (and alias /api/courses/register)
 * Smart Course Enrollment:
 * - If user logged in, links to user_id and pre-fills profile data
 * - Prevents duplicate enrollment for same course
 * - Stores in PostgreSQL enrollments & course_registrations tables
 */
const handleEnrollment = async (req, res) => {
  try {
    const decodedUser = getOptionalUser(req);
    let userId = decodedUser ? decodedUser.id : null;

    let {
      name,
      mobile,
      email,
      trading_experience,
      interest,
      reference,
      course_slug = 'trading-masterclass',
      course_id,
      course_name,
      batch_name,
    } = req.body;

    // 1. Fetch DB User if authenticated to fill in verified data
    if (userId) {
      const userDbRes = await pool.query(
        'SELECT id, name, email, mobile, trading_experience FROM users WHERE id = $1 LIMIT 1',
        [userId]
      );
      if (userDbRes.rows.length > 0) {
        const u = userDbRes.rows[0];
        name = (name && name.trim()) || u.name;
        email = (email && email.trim()) || u.email;
        mobile = (mobile && mobile.trim()) || u.mobile;
        trading_experience = trading_experience || u.trading_experience;

        // If user submitted mobile and had none in profile, update profile
        if (mobile && (!u.mobile || !u.mobile.trim())) {
          await pool.query('UPDATE users SET mobile = $1 WHERE id = $2', [mobile.trim(), u.id]);
        }
      }
    }

    // 2. Resolve Target Course
    let targetCourse = null;
    if (course_id) {
      const cRes = await pool.query('SELECT * FROM courses WHERE id = $1 LIMIT 1', [course_id]);
      if (cRes.rows.length > 0) targetCourse = cRes.rows[0];
    }
    if (!targetCourse && course_slug) {
      const cRes = await pool.query('SELECT * FROM courses WHERE slug = $1 LIMIT 1', [course_slug]);
      if (cRes.rows.length > 0) targetCourse = cRes.rows[0];
    }
    if (!targetCourse) {
      const cRes = await pool.query("SELECT * FROM courses WHERE slug = 'trading-masterclass' LIMIT 1");
      if (cRes.rows.length > 0) targetCourse = cRes.rows[0];
    }

    const resolvedCourseId = targetCourse ? targetCourse.id : null;
    const resolvedCourseName = (targetCourse && targetCourse.title) || course_name || 'Trading Masterclass';
    const resolvedBatch = (targetCourse && targetCourse.batch_name) || batch_name || 'November';
    const resolvedPrice = targetCourse ? targetCourse.price : 19999.00;

    // 3. Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!mobile || typeof mobile !== 'string' || !mobile.trim()) {
      return res.status(400).json({ success: false, error: 'Mobile number is required.' });
    }

    if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();
    const cleanName = name.trim();
    const cleanReference = reference ? String(reference).trim() : 'Website';
    const experienceValue = trading_experience && VALID_EXPERIENCES.includes(trading_experience)
      ? trading_experience
      : 'Beginner';
    const interestValue = interest && VALID_INTERESTS.includes(interest)
      ? interest
      : 'Both';

    // 4. Duplicate Enrollment Prevention Check
    const duplicateQuery = await pool.query(
      `SELECT id FROM enrollments
       WHERE (course_id = $1 OR course_name = $2)
         AND (
           (user_id IS NOT NULL AND user_id = $3)
           OR LOWER(email) = $4
         )
       LIMIT 1`,
      [resolvedCourseId, resolvedCourseName, userId, cleanEmail]
    );

    if (duplicateQuery.rows.length > 0) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        error: 'You are already registered/enrolled for this course cohort.',
      });
    }

    // 5. Enforce server-side payment requirement for paid courses
    if (Number(resolvedPrice) > 0) {
      return res.status(402).json({
        success: false,
        requires_payment: true,
        error: 'This is a paid course. Enrollment requires payment verification through Razorpay.',
      });
    }

    // 6. Insert into Enrollments (Free courses only)
    const enrollResult = await pool.query(
      `INSERT INTO enrollments (
        user_id, course_id, course_name, name, email, mobile,
        trading_experience, interest, reference, batch_name,
        enrollment_status, payment_status, amount_paid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'enrolled', 'completed', $11)
      RETURNING *`,
      [
        userId,
        resolvedCourseId,
        resolvedCourseName,
        cleanName,
        cleanEmail,
        cleanMobile,
        experienceValue,
        interestValue,
        cleanReference,
        resolvedBatch,
        resolvedPrice,
      ]
    );

    const enrollment = enrollResult.rows[0];

    // 6. Sync into course_registrations for backwards compatibility
    await pool.query(
      `INSERT INTO course_registrations (
        user_id, course_id, name, mobile, email,
        trading_experience, interest, reference, course_name,
        batch_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'enrolled')`,
      [
        userId,
        resolvedCourseId,
        cleanName,
        cleanMobile,
        cleanEmail,
        experienceValue,
        interestValue,
        cleanReference,
        resolvedCourseName,
        resolvedBatch,
      ]
    );

    // 7. Decrement available seats if seat count enabled and > 0
    await pool.query(
      `UPDATE course_settings
       SET seats_available = GREATEST(0, seats_available - 1),
           updated_at = CURRENT_TIMESTAMP
       WHERE course_slug = 'trading-masterclass' AND seats_available > 0`
    );

    return res.status(201).json({
      success: true,
      message: 'Congratulations! Your enrollment in TRADEMAX Trading Masterclass has been successfully confirmed.',
      enrollment,
    });
  } catch (err) {
    console.error('[Course Enrollment Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while processing your enrollment. Please try again.',
    });
  }
};

coursesRouter.post('/enroll', handleEnrollment);
coursesRouter.post('/register', handleEnrollment);

// Check if user is already enrolled in a course
coursesRouter.get('/check-enrollment', async (req, res) => {
  try {
    const decodedUser = getOptionalUser(req);
    const { course_slug = 'trading-masterclass', email } = req.query;

    const checkEmail = (decodedUser && decodedUser.email) || email;
    const userId = decodedUser ? decodedUser.id : null;

    if (!checkEmail && !userId) {
      return res.status(200).json({ success: true, isEnrolled: false });
    }

    const result = await pool.query(
      `SELECT e.id, e.course_name, e.batch_name, e.created_at
       FROM enrollments e
       LEFT JOIN courses c ON e.course_id = c.id
       WHERE (c.slug = $1 OR e.course_name ILIKE '%Trading Masterclass%')
         AND (
           (e.user_id IS NOT NULL AND e.user_id = $2)
           OR LOWER(e.email) = LOWER($3)
         )
       LIMIT 1`,
      [course_slug, userId, checkEmail || '']
    );

    if (result.rows.length > 0) {
      return res.status(200).json({
        success: true,
        isEnrolled: true,
        enrollment: result.rows[0],
      });
    }

    return res.status(200).json({ success: true, isEnrolled: false });
  } catch (err) {
    console.error('[Check Enrollment Error]:', err);
    return res.status(500).json({ success: false, error: 'Could not check enrollment status.' });
  }
});
