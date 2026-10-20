import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { adminMiddleware } from '../middleware/admin.js';
import {
  generatePresignedPutUrl,
  generatePresignedGetUrl,
  verifyS3Object,
  deleteS3Object,
  initiateMultipart,
  generatePresignedPartUrl,
  completeMultipart,
  abortMultipart,
} from '../services/s3Service.js';
import {
  saveAdminQrCode,
  getPrivateScreenshotFilePath,
} from '../services/storageService.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const cleanExt = path.extname(file.originalname).toLowerCase();
    cb(null, `resource-${uniqueSuffix}${cleanExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|png|jpg|jpeg|webp|zip/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Word, Excel, Images, Zip, Text.'));
    }
  },
});

export const adminRouter = Router();

// Protect all admin routes with real-time role-based access control
adminRouter.use(adminMiddleware);

// ============================================================================
// 1. DASHBOARD OVERVIEW & ANALYTICS
// ============================================================================
adminRouter.get('/dashboard/stats', async (req, res) => {
  try {
    // 1. Total users (excluding admin)
    const usersCountRes = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role != 'admin'"
    );
    const totalUsers = parseInt(usersCountRes.rows[0].count, 10) || 0;

    // 2. Total published & total courses
    const coursesCountRes = await pool.query(
      'SELECT COUNT(*) as count FROM courses'
    );
    const totalCourses = parseInt(coursesCountRes.rows[0].count, 10) || 0;

    // 3. Total Enrollments
    const enrollmentsCountRes = await pool.query(
      'SELECT COUNT(*) as count FROM enrollments'
    );
    const totalEnrollments = parseInt(enrollmentsCountRes.rows[0].count, 10) || 0;

    // 4. Total Revenue
    const revenueRes = await pool.query(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM enrollments WHERE payment_status = 'completed'"
    );
    const totalRevenue = parseFloat(revenueRes.rows[0].total) || 0;

    // 5. Recent Registered Users (Last 5)
    const recentUsersRes = await pool.query(
      `SELECT id, name, email, mobile, role, status, trading_experience, created_at
       FROM users
       WHERE role != 'admin'
       ORDER BY created_at DESC
       LIMIT 5`
    );

    // 6. Recent Enrollments (Last 6)
    const recentEnrollmentsRes = await pool.query(
      `SELECT e.id, e.name, e.email, e.mobile, e.course_name, e.batch_name,
              e.enrollment_status, e.payment_status, e.amount_paid, e.created_at,
              c.slug as course_slug
       FROM enrollments e
       LEFT JOIN courses c ON e.course_id = c.id
       ORDER BY e.created_at DESC
       LIMIT 6`
    );

    // 7. Popular Courses with enrollment counts
    const popularCoursesRes = await pool.query(
      `SELECT c.id, c.title, c.slug, c.price, c.is_published, c.batch_name,
              COUNT(e.id) as enrollment_count
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       GROUP BY c.id
       ORDER BY enrollment_count DESC, c.created_at DESC
       LIMIT 5`
    );

    // 8. Monthly Enrollment Trends (Last 6 months)
    const trendsRes = await pool.query(
      `SELECT TO_CHAR(created_at, 'Mon YYYY') as month,
              COUNT(*) as count,
              COALESCE(SUM(amount_paid), 0) as revenue
       FROM enrollments
       WHERE created_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(created_at, 'Mon YYYY'), DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at) ASC`
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalRevenue,
        recentUsers: recentUsersRes.rows,
        recentEnrollments: recentEnrollmentsRes.rows,
        popularCourses: popularCoursesRes.rows,
        trends: trendsRes.rows,
      },
    });
  } catch (err) {
    console.error('[Admin Dashboard Stats Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard statistics.',
    });
  }
});

// Reset Platform Data (Enrollments, Revenue & Student Users - Preserves Courses, Admin Accounts & Settings)
adminRouter.post('/dashboard/reset-platform-data', async (req, res) => {
  const client = await pool.connect();
  try {
    // Role check confirmation: req.user is verified by adminMiddleware
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: Only administrators can reset platform data.',
      });
    }

    // Clean up all local screenshot files from manual claims
    try {
      const claimsRes = await client.query('SELECT screenshot_path FROM manual_payment_claims');
      for (const claim of claimsRes.rows) {
        if (claim.screenshot_path) {
          const filePath = getPrivateScreenshotFilePath(claim.screenshot_path);
          if (filePath && fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (fileErr) {
              // Ignore single file unlink error
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Admin Reset Platform] Screenshot cleanup error:', e.message);
    }

    await client.query('BEGIN');

    // 1. Delete lesson progress records
    await client.query('DELETE FROM lesson_progress');

    // 2. Delete course notifications
    await client.query('DELETE FROM course_notifications');

    // 3. Delete manual payment claims
    await client.query('DELETE FROM manual_payment_claims');

    // 4. Delete payments (all transaction/order records)
    await client.query('DELETE FROM payments');

    // 5. Delete legacy course registrations
    await client.query('DELETE FROM course_registrations');

    // 6. Delete enquiries
    await client.query('DELETE FROM enquiries');

    // 7. Delete enrollments (resets enrollments and revenue data)
    await client.query('DELETE FROM enrollments');

    // 8. Delete all non-admin users (preserving admin accounts)
    const delUsersRes = await client.query("DELETE FROM users WHERE role != 'admin' RETURNING id");

    await client.query('COMMIT');

    console.log(`[Admin Reset Platform Data] Successfully reset platform data. Removed ${delUsersRes.rowCount} student accounts and all enrollment/revenue records.`);

    return res.status(200).json({
      success: true,
      message: `Platform data reset successfully. Cleared ${delUsersRes.rowCount} student accounts, all course enrollments, and revenue metrics. Courses and administrator accounts were preserved.`,
      deletedUsersCount: delUsersRes.rowCount,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Admin Reset Platform Data Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset platform data safely.',
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// 2. USERS MANAGEMENT
// ============================================================================
adminRouter.get('/users', async (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const searchPattern = `%${search.trim().toLowerCase()}%`;

    const countRes = await pool.query(
      `SELECT COUNT(*) as total
       FROM users u
       WHERE (LOWER(u.name) LIKE $1 OR LOWER(u.email) LIKE $1 OR COALESCE(u.mobile, '') LIKE $1)
         AND ($2 = 'all' OR u.status = $2)`,
      [searchPattern, status]
    );
    const total = parseInt(countRes.rows[0].total, 10) || 0;

    const usersRes = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role, u.status,
              u.trading_experience, u.created_at,
              COUNT(e.id) as enrollments_count
       FROM users u
       LEFT JOIN enrollments e ON u.id = e.user_id
       WHERE (LOWER(u.name) LIKE $1 OR LOWER(u.email) LIKE $1 OR COALESCE(u.mobile, '') LIKE $1)
         AND ($2 = 'all' OR u.status = $2)
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $3 OFFSET $4`,
      [searchPattern, status, limitNum, offset]
    );

    return res.status(200).json({
      success: true,
      users: usersRes.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('[Admin Users List Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve users list.',
    });
  }
});

// Export all registered users as formatted CSV/Excel (Defined BEFORE /users/:id)
adminRouter.get('/users/export', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role, u.status,
              u.trading_experience, u.created_at,
              COUNT(e.id) as enrollments_count
       FROM users u
       LEFT JOIN enrollments e ON u.id = e.user_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    const headers = [
      'User ID',
      'Full Name',
      'Email Address',
      'Mobile Number',
      'Account Role',
      'Trading Experience',
      'Account Status',
      'Enrollments Count',
      'Registration Date',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = result.rows.map((u) => [
      escapeCsv(u.id),
      escapeCsv(u.name),
      escapeCsv(u.email),
      escapeCsv(u.mobile || ''),
      escapeCsv(u.role),
      escapeCsv(u.trading_experience || ''),
      escapeCsv(u.status || 'active'),
      escapeCsv(u.enrollments_count || 0),
      escapeCsv(new Date(u.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })),
    ]);

    // Prepend UTF-8 BOM (\uFEFF) for native Excel support
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="TradeMax_Registered_Users_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('[Admin Export Users Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to export users.' });
  }
});

// Single User Profile & All Registered Courses
adminRouter.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const userRes = await pool.query(
      `SELECT id, name, email, mobile, role, status, reference,
              trading_experience, has_seen_welcome, created_at, updated_at
       FROM users
       WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const user = userRes.rows[0];

    // Fetch all courses enrolled by this user
    const enrollmentsRes = await pool.query(
      `SELECT e.id, e.course_id, e.course_name, e.batch_name,
              e.enrollment_status, e.payment_status, e.amount_paid, e.created_at,
              c.slug as course_slug, c.price, c.thumbnail
       FROM enrollments e
       LEFT JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = $1 OR LOWER(e.email) = LOWER($2)
       ORDER BY e.created_at DESC`,
      [user.id, user.email]
    );

    return res.status(200).json({
      success: true,
      user,
      enrollments: enrollmentsRes.rows,
    });
  } catch (err) {
    console.error('[Admin Single User Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to load user profile.',
    });
  }
});

// Update User Status (active / suspended)
adminRouter.patch('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'suspended', 'inactive'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid user status.' });
    }

    const result = await pool.query(
      `UPDATE users
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, name, email, status, updated_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `User status changed to ${status}.`,
      user: result.rows[0],
    });
  } catch (err) {
    console.error('[Admin User Status Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user status.',
    });
  }
});

// Delete User and Associated Data Permanently
adminRouter.delete('/users/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    // Prevent deleting own admin account
    if (req.user && req.user.id === userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own administrator account while logged in.',
      });
    }

    // Check if target user exists
    const userRes = await client.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const targetUser = userRes.rows[0];

    // Prevent deleting administrators
    if (targetUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Administrator accounts cannot be deleted.',
      });
    }

    // Clean up local screenshot evidence if manual payment claims exist
    try {
      const claimsRes = await client.query(
        'SELECT screenshot_path FROM manual_payment_claims WHERE user_id = $1',
        [userId]
      );
      for (const claim of claimsRes.rows) {
        if (claim.screenshot_path) {
          const filePath = getPrivateScreenshotFilePath(claim.screenshot_path);
          if (filePath && fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (fileErr) {
              console.warn('[Admin Delete User] Could not remove screenshot file:', fileErr.message);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Admin Delete User] Screenshot cleanup check failed:', e.message);
    }

    await client.query('BEGIN');

    // 1. Remove lesson progress
    await client.query('DELETE FROM lesson_progress WHERE user_id = $1', [userId]);

    // 2. Remove in-app course notifications
    await client.query('DELETE FROM course_notifications WHERE user_id = $1', [userId]);

    // 3. Remove manual payment claims
    await client.query('DELETE FROM manual_payment_claims WHERE user_id = $1', [userId]);

    // 4. Remove payments (matched by user_id or customer_email)
    await client.query(
      'DELETE FROM payments WHERE user_id = $1 OR LOWER(customer_email) = LOWER($2)',
      [userId, targetUser.email]
    );

    // 5. Remove course registrations (legacy)
    await client.query(
      'DELETE FROM course_registrations WHERE user_id = $1 OR LOWER(email) = LOWER($2)',
      [userId, targetUser.email]
    );

    // 6. Remove enquiries
    await client.query(
      'DELETE FROM enquiries WHERE user_id = $1 OR LOWER(email) = LOWER($2)',
      [userId, targetUser.email]
    );

    // 7. Remove course enrollments
    await client.query(
      'DELETE FROM enrollments WHERE user_id = $1 OR LOWER(email) = LOWER($2)',
      [userId, targetUser.email]
    );

    // 8. Nullify audit references where this user may have been referenced
    await client.query('UPDATE manual_payment_claims SET reviewed_by = NULL WHERE reviewed_by = $1', [userId]);
    await client.query('UPDATE payment_settings SET updated_by = NULL WHERE updated_by = $1', [userId]);
    await client.query('UPDATE course_lessons SET created_by = NULL WHERE created_by = $1', [userId]);
    await client.query('UPDATE course_resources SET created_by = NULL WHERE created_by = $1', [userId]);

    // 9. Permanently delete the user record
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    console.log(`[Admin User Delete] Successfully deleted user #${userId} (${targetUser.name} <${targetUser.email}>) and associated data.`);

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.name} (${targetUser.email}) and associated records were permanently deleted.`,
      deletedUserId: userId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Admin User Delete Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user account safely.',
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// 3. COURSES MANAGEMENT
// ============================================================================
adminRouter.get('/courses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              COUNT(e.id) as enrolled_count
       FROM courses c
       LEFT JOIN enrollments e ON c.id = e.course_id
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      courses: result.rows,
    });
  } catch (err) {
    console.error('[Admin Courses List Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve courses.',
    });
  }
});

// Single Course Details + List of all enrolled students
adminRouter.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const courseRes = await pool.query(
      'SELECT * FROM courses WHERE id = $1 LIMIT 1',
      [id]
    );

    if (courseRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }

    const course = courseRes.rows[0];

    const studentsRes = await pool.query(
      `SELECT e.id, e.user_id, e.name, e.email, e.mobile, e.trading_experience,
              e.batch_name, e.enrollment_status, e.payment_status, e.amount_paid,
              e.created_at
       FROM enrollments e
       WHERE e.course_id = $1
       ORDER BY e.created_at DESC`,
      [course.id]
    );

    return res.status(200).json({
      success: true,
      course,
      enrolledStudents: studentsRes.rows,
      totalEnrolled: studentsRes.rows.length,
    });
  } catch (err) {
    console.error('[Admin Single Course Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch course details.',
    });
  }
});

// Create New Course
adminRouter.post('/courses', async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      thumbnail = '/1-c.jpeg',
      price = 19999,
      original_price = 24999,
      discount_label = 'Save ₹5,000 (20% OFF)',
      duration = '1 Month',
      level = 'Forex & Crypto',
      learning_mode = 'Live Online',
      batch_name = 'November',
      seats_available = 15,
      is_published = true,
      topics,
      learning_outcomes,
      objectives,
      syllabus,
      instructor_name = 'Patil Trader',
      instructor_bio,
      instructor_image = '/heroo.png',
      methodology,
      assignments_info,
      assessment_info,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Course title is required.' });
    }

    // Format topics as valid JSONB
    let formattedTopics = null;
    if (topics) {
      if (Array.isArray(topics)) {
        formattedTopics = JSON.stringify(topics);
      } else if (typeof topics === 'string') {
        const trimmed = topics.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            formattedTopics = JSON.stringify(JSON.parse(trimmed));
          } catch {
            formattedTopics = JSON.stringify(trimmed.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean));
          }
        } else {
          formattedTopics = JSON.stringify(trimmed.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean));
        }
      }
    }

    // Generate unique slug
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    let slug = baseSlug || `course-${Date.now()}`;
    const slugCheck = await pool.query('SELECT id FROM courses WHERE slug = $1 LIMIT 1', [slug]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const insertRes = await pool.query(
      `INSERT INTO courses (
        slug, title, subtitle, description, thumbnail, price, original_price,
        discount_label, duration, level, learning_mode, batch_name,
        seats_available, is_published, topics, learning_outcomes, objectives,
        syllabus, instructor_name, instructor_bio, instructor_image, methodology,
        assignments_info, assessment_info
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15::jsonb, $16, $17,
        $18, $19, $20, $21, $22,
        $23, $24
      )
      RETURNING *`,
      [
        slug,
        title.trim(),
        subtitle || 'Professional Financial Education',
        description || '',
        thumbnail || '/1-c.jpeg',
        parseFloat(price) || 0,
        parseFloat(original_price) || 0,
        discount_label || '',
        duration || '1 Month',
        level || 'Forex & Crypto',
        learning_mode || 'Live Online',
        batch_name || 'November',
        parseInt(seats_available, 10) || 15,
        Boolean(is_published),
        formattedTopics,
        learning_outcomes || null,
        objectives || null,
        syllabus || null,
        instructor_name || 'Patil Trader',
        instructor_bio || null,
        instructor_image || '/heroo.png',
        methodology || null,
        assignments_info || null,
        assessment_info || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Course created successfully.',
      course: insertRes.rows[0],
    });
  } catch (err) {
    console.error('[Admin Create Course Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create course.',
    });
  }
});

// Update Existing Course
adminRouter.put('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      thumbnail,
      price,
      original_price,
      discount_label,
      duration,
      level,
      learning_mode,
      batch_name,
      seats_available,
      is_published,
      topics,
      learning_outcomes,
      objectives,
      syllabus,
      instructor_name,
      instructor_bio,
      instructor_image,
      methodology,
      assignments_info,
      assessment_info,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Course title is required.' });
    }

    // Format topics as valid JSONB
    let formattedTopics = null;
    if (topics !== undefined) {
      if (Array.isArray(topics)) {
        formattedTopics = JSON.stringify(topics);
      } else if (typeof topics === 'string') {
        const trimmed = topics.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            formattedTopics = JSON.stringify(JSON.parse(trimmed));
          } catch {
            formattedTopics = JSON.stringify(trimmed.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean));
          }
        } else {
          formattedTopics = JSON.stringify(trimmed.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean));
        }
      }
    }

    const updateRes = await pool.query(
      `UPDATE courses
       SET title = $1,
           subtitle = $2,
           description = $3,
           thumbnail = $4,
           price = $5,
           original_price = $6,
           discount_label = $7,
           duration = $8,
           level = $9,
           learning_mode = $10,
           batch_name = $11,
           seats_available = $12,
           is_published = $13,
           topics = COALESCE($14::jsonb, courses.topics),
           learning_outcomes = $15,
           objectives = $16,
           syllabus = $17,
           instructor_name = $18,
           instructor_bio = $19,
           instructor_image = $20,
           methodology = $21,
           assignments_info = $22,
           assessment_info = $23,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $24
       RETURNING *`,
      [
        title.trim(),
        subtitle,
        description,
        thumbnail || '/1-c.jpeg',
        parseFloat(price) || 0,
        parseFloat(original_price) || 0,
        discount_label,
        duration || '1 Month',
        level || 'Forex & Crypto',
        learning_mode || 'Live Online',
        batch_name || 'November',
        parseInt(seats_available, 10) || 15,
        Boolean(is_published),
        formattedTopics,
        learning_outcomes || null,
        objectives || null,
        syllabus || null,
        instructor_name || 'Patil Trader',
        instructor_bio || null,
        instructor_image || '/heroo.png',
        methodology || null,
        assignments_info || null,
        assessment_info || null,
        id,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }

    const updatedCourse = updateRes.rows[0];

    // Synchronize course_settings so batch and seats are updated everywhere
    if (updatedCourse.slug === 'trading-masterclass' || parseInt(id, 10) === 1) {
      await pool.query(
        `UPDATE course_settings
         SET batch_name = $1, seats_available = $2, updated_at = CURRENT_TIMESTAMP
         WHERE course_slug = 'trading-masterclass'`,
        [updatedCourse.batch_name, updatedCourse.seats_available]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully.',
      course: updatedCourse,
    });
  } catch (err) {
    console.error('[Admin Update Course Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update course.',
    });
  }
});

// Toggle Course Publish / Unpublish
adminRouter.patch('/courses/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;

    const result = await pool.query(
      `UPDATE courses
       SET is_published = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, title, is_published`,
      [Boolean(is_published), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Course ${result.rows[0].is_published ? 'published' : 'unpublished'} successfully.`,
      course: result.rows[0],
    });
  } catch (err) {
    console.error('[Admin Toggle Publish Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update course publish state.',
    });
  }
});

// Delete Course
adminRouter.delete('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleteRes = await pool.query(
      'DELETE FROM courses WHERE id = $1 RETURNING id, title',
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Course "${deleteRes.rows[0].title}" deleted successfully.`,
    });
  } catch (err) {
    console.error('[Admin Delete Course Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete course.',
    });
  }
});

// ============================================================================
// 4. ENROLLMENTS MANAGEMENT
// ============================================================================
// 6. ENROLLMENTS MANAGEMENT (Export, List, Update Status, Delete)
// ============================================================================
adminRouter.get('/enrollments/export', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id, e.name, e.email, e.mobile, e.course_name, e.batch_name,
              e.enrollment_status, e.payment_status, e.amount_paid, e.created_at
       FROM enrollments e
       ORDER BY e.created_at DESC`
    );

    const headers = [
      'Enrollment ID',
      'Student Name',
      'Email Address',
      'Mobile Number',
      'Course Name',
      'Batch',
      'Enrollment Status',
      'Payment Status',
      'Amount Paid (₹)',
      'Enrolled Date',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = result.rows.map((e) => [
      escapeCsv(e.id),
      escapeCsv(e.name),
      escapeCsv(e.email),
      escapeCsv(e.mobile || ''),
      escapeCsv(e.course_name),
      escapeCsv(e.batch_name || ''),
      escapeCsv(e.enrollment_status || 'enrolled'),
      escapeCsv(e.payment_status || 'pending'),
      escapeCsv(e.amount_paid || 0),
      escapeCsv(new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="TradeMax_Enrollments_${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    console.error('[Admin Export Enrollments Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to export enrollments.' });
  }
});

adminRouter.get('/enrollments', async (req, res) => {
  try {
    const {
      search = '',
      courseId = 'all',
      status = 'all',
      paymentStatus = 'all',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const searchPattern = `%${search.trim().toLowerCase()}%`;

    const countRes = await pool.query(
      `SELECT COUNT(*) as total
       FROM enrollments e
       WHERE (LOWER(e.name) LIKE $1 OR LOWER(e.email) LIKE $1 OR e.mobile LIKE $1 OR LOWER(e.course_name) LIKE $1)
         AND ($2 = 'all' OR e.course_id::text = $2)
         AND ($3 = 'all' OR e.enrollment_status = $3)
         AND ($4 = 'all' OR e.payment_status = $4)`,
      [searchPattern, courseId, status, paymentStatus]
    );
    const total = parseInt(countRes.rows[0].total, 10) || 0;

    const enrollmentsRes = await pool.query(
      `SELECT e.id, e.user_id, e.course_id, e.course_name, e.name, e.email, e.mobile,
              e.trading_experience, e.batch_name, e.enrollment_status, e.payment_status,
              e.amount_paid, e.created_at,
              c.slug as course_slug
       FROM enrollments e
       LEFT JOIN courses c ON e.course_id = c.id
       WHERE (LOWER(e.name) LIKE $1 OR LOWER(e.email) LIKE $1 OR e.mobile LIKE $1 OR LOWER(e.course_name) LIKE $1)
         AND ($2 = 'all' OR e.course_id::text = $2)
         AND ($3 = 'all' OR e.enrollment_status = $3)
         AND ($4 = 'all' OR e.payment_status = $4)
       ORDER BY e.created_at DESC
       LIMIT $5 OFFSET $6`,
      [searchPattern, courseId, status, paymentStatus, limitNum, offset]
    );

    return res.status(200).json({
      success: true,
      enrollments: enrollmentsRes.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('[Admin Enrollments List Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve enrollments.',
    });
  }
});

// Update Enrollment Status or Payment Status
adminRouter.patch('/enrollments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { enrollment_status, payment_status } = req.body;

    const validEnrollmentStatuses = ['enrolled', 'pending', 'completed', 'cancelled'];
    const validPaymentStatuses = ['completed', 'pending', 'waived', 'refunded'];

    const updates = [];
    const values = [];
    let idx = 1;

    if (enrollment_status && validEnrollmentStatuses.includes(enrollment_status)) {
      updates.push(`enrollment_status = $${idx++}`);
      values.push(enrollment_status);
    }

    if (payment_status && validPaymentStatuses.includes(payment_status)) {
      updates.push(`payment_status = $${idx++}`);
      values.push(payment_status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update.' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE enrollments
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Enrollment record not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Enrollment updated successfully.',
      enrollment: result.rows[0],
    });
  } catch (err) {
    console.error('[Admin Update Enrollment Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update enrollment record.',
    });
  }
});

// Delete Enrollment
adminRouter.delete('/enrollments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleteRes = await pool.query(
      'DELETE FROM enrollments WHERE id = $1 RETURNING id, name, course_name',
      [id]
    );

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Enrollment not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Enrollment for ${deleteRes.rows[0].name} deleted.`,
    });
  } catch (err) {
    console.error('[Admin Delete Enrollment Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete enrollment.',
    });
  }
});

// ============================================================================
// 5. PLATFORM SETTINGS & ADMIN PROFILE
// ============================================================================
adminRouter.get('/settings', async (req, res) => {
  try {
    const courseSettingsRes = await pool.query(
      `SELECT * FROM course_settings WHERE course_slug = 'trading-masterclass' LIMIT 1`
    );

    const settings = courseSettingsRes.rows[0] || {
      batch_name: 'November',
      seats_available: 15,
      show_seat_count: false,
      announcement_text: 'November Batch — Limited Seats Available',
      contact_phone: '8799026206',
    };

    return res.status(200).json({
      success: true,
      settings: {
        batchName: settings.batch_name,
        seatsAvailable: settings.seats_available,
        showSeatCount: settings.show_seat_count,
        announcementText: settings.announcement_text,
        contactPhone: settings.contact_phone || '6352461137',
      },
    });
  } catch (err) {
    console.error('[Admin Settings Get Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve settings.',
    });
  }
});

adminRouter.put('/settings', async (req, res) => {
  try {
    const { batchName, seatsAvailable, showSeatCount, announcementText, contactPhone } = req.body;

    const seats = parseInt(seatsAvailable, 10);
    const validSeats = !isNaN(seats) && seats >= 0 ? seats : 15;
    const showCount = Boolean(showSeatCount);
    const announcement = announcementText ? String(announcementText).trim() : 'November Batch — Limited Seats Available';
    const batch = batchName ? String(batchName).trim() : 'November';
    const phone = contactPhone ? String(contactPhone).trim() : '8799026206';

    await pool.query(
      `UPDATE course_settings
       SET seats_available = $1,
           show_seat_count = $2,
           announcement_text = $3,
           batch_name = $4,
           contact_phone = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE course_slug = 'trading-masterclass'`,
      [validSeats, showCount, announcement, batch, phone]
    );

    // Also sync the default course's batch_name and seats_available
    await pool.query(
      `UPDATE courses
       SET batch_name = $1, seats_available = $2, updated_at = CURRENT_TIMESTAMP
       WHERE slug = 'trading-masterclass'`,
      [batch, validSeats]
    );

    return res.status(200).json({
      success: true,
      message: 'Platform settings saved successfully.',
      settings: {
        batchName: batch,
        seatsAvailable: validSeats,
        showSeatCount: showCount,
        announcementText: announcement,
        contactPhone: phone,
      },
    });
  } catch (err) {
    console.error('[Admin Settings Put Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update settings.',
    });
  }
});

// Update Admin Profile
adminRouter.put('/profile', async (req, res) => {
  try {
    const { name, email, newPassword } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required.' });
    }

    if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'Valid email is required.' });
    }

    const updates = ['name = $1', 'email = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [name.trim(), email.trim().toLowerCase(), req.user.id];

    if (newPassword && typeof newPassword === 'string' && newPassword.length >= 6) {
      const hashed = await bcrypt.hash(newPassword, 10);
      updates.push(`password = $${values.length + 1}`);
      values.splice(2, 0, hashed);
    }

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, name, email, role, status`,
      values
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('[Admin Profile Update Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile.',
    });
  }
});

// ============================================================================
// 7. ANNOUNCEMENTS MANAGEMENT (ADMIN)
// ============================================================================
adminRouter.get('/announcements', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    return res.status(200).json({ success: true, announcements: result.rows });
  } catch (err) {
    console.error('[Admin Announcements List Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch announcements.' });
  }
});

adminRouter.post('/announcements', async (req, res) => {
  try {
    const { title, content, category = 'General', is_published = true } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required.' });
    }
    const result = await pool.query(
      `INSERT INTO announcements (title, content, category, is_published, published_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING *`,
      [title.trim(), content.trim(), category.trim(), Boolean(is_published)]
    );
    return res.status(201).json({ success: true, announcement: result.rows[0] });
  } catch (err) {
    console.error('[Admin Announcement Create Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to create announcement.' });
  }
});

adminRouter.delete('/announcements/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    console.error('[Admin Announcement Delete Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete announcement.' });
  }
});

// ============================================================================
// 8. LIVE CLASSES MANAGEMENT (ADMIN)
// ============================================================================
adminRouter.get('/live-classes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lc.*, c.title as course_name
      FROM live_classes lc
      LEFT JOIN courses c ON lc.course_id = c.id
      ORDER BY lc.scheduled_at ASC
    `);
    return res.status(200).json({ success: true, liveClasses: result.rows });
  } catch (err) {
    console.error('[Admin Live Classes List Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch live classes.' });
  }
});

adminRouter.post('/live-classes', async (req, res) => {
  try {
    const {
      course_id,
      title,
      batch_name = 'November',
      scheduled_at,
      duration_minutes = 75,
      meeting_link,
      platform = 'Google Meet',
      instructor = 'Patil Trader',
      status = 'upcoming',
      description,
    } = req.body;

    if (!title || !scheduled_at) {
      return res.status(400).json({ success: false, error: 'Meeting title and scheduled time are required.' });
    }

    const result = await pool.query(
      `INSERT INTO live_classes (
        course_id, title, batch_name, scheduled_at, duration_minutes,
        meeting_link, platform, instructor, status, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        course_id || null,
        title.trim(),
        batch_name.trim(),
        scheduled_at,
        parseInt(duration_minutes, 10) || 75,
        meeting_link ? meeting_link.trim() : null,
        platform.trim() || 'Google Meet',
        instructor.trim() || 'Patil Trader',
        status.trim() || 'upcoming',
        description ? description.trim() : null,
      ]
    );

    return res.status(201).json({ success: true, liveClass: result.rows[0] });
  } catch (err) {
    console.error('[Admin Live Class Create Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to create live class.' });
  }
});

adminRouter.put('/live-classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      course_id,
      title,
      batch_name,
      scheduled_at,
      duration_minutes,
      meeting_link,
      platform,
      instructor,
      status,
      description,
    } = req.body;

    if (!title || !scheduled_at) {
      return res.status(400).json({ success: false, error: 'Title and scheduled time are required.' });
    }

    const result = await pool.query(
      `UPDATE live_classes
       SET course_id = $1,
           title = $2,
           batch_name = $3,
           scheduled_at = $4,
           duration_minutes = $5,
           meeting_link = $6,
           platform = $7,
           instructor = $8,
           status = $9,
           description = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        course_id || null,
        title.trim(),
        batch_name ? batch_name.trim() : 'November',
        scheduled_at,
        parseInt(duration_minutes, 10) || 75,
        meeting_link ? meeting_link.trim() : null,
        platform ? platform.trim() : 'Google Meet',
        instructor ? instructor.trim() : 'Patil Trader',
        status ? status.trim() : 'upcoming',
        description ? description.trim() : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Live class not found.' });
    }

    return res.status(200).json({ success: true, liveClass: result.rows[0] });
  } catch (err) {
    console.error('[Admin Live Class Update Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to update live class.' });
  }
});

adminRouter.delete('/live-classes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM live_classes WHERE id = $1', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Live class deleted.' });
  } catch (err) {
    console.error('[Admin Live Class Delete Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete live class.' });
  }
});

// ============================================================================
// INDIVIDUAL COURSE MANAGEMENT WORKSPACE APIs
// Every action is strictly isolated by course_id
// ============================================================================

/**
 * GET /api/admin/courses/:courseId/manage
 * Comprehensive payload for individual course management workspace
 */
adminRouter.get('/courses/:courseId/manage', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    if (isNaN(courseId)) {
      return res.status(400).json({ success: false, error: 'Invalid course ID.' });
    }

    // 1. Course Details
    const courseRes = await pool.query('SELECT * FROM courses WHERE id = $1 LIMIT 1', [courseId]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }
    const course = courseRes.rows[0];

    // 2. Video Lessons (Enhanced with S3 Storage & Batch Metadata)
    const lessonsRes = await pool.query(
      `SELECT id, course_id, module_name, title, description, s3_key, video_url,
              duration_minutes, sort_order, batch_name, original_filename,
              content_type, file_size, release_at, is_published, created_at, updated_at
       FROM course_lessons
       WHERE course_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [courseId]
    );

    // 2b. Course Modules
    const modulesRes = await pool.query(
      `SELECT id, course_id, title, sort_order, created_at
       FROM course_modules
       WHERE course_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [courseId]
    );

    // 3. Live Classes
    const liveRes = await pool.query(
      `SELECT id, course_id, title, batch_name, scheduled_at, duration_minutes, meeting_link, platform, instructor, instructions, status, description, created_at
       FROM live_classes
       WHERE course_id = $1
       ORDER BY scheduled_at ASC`,
      [courseId]
    );

    // 4. Course Announcements
    const announceRes = await pool.query(
      `SELECT id, course_id, batch_name, title, content, category, author, is_pinned, published_date, is_published, created_at
       FROM announcements
       WHERE course_id = $1
       ORDER BY is_pinned DESC, created_at DESC`,
      [courseId]
    );

    // 5. Course Posts, Notes, PDFs & Assignments
    const resourcesRes = await pool.query(
      `SELECT id, course_id, batch_name, title, description, resource_type, resource_url, s3_key, file_name, file_size, is_published, created_at
       FROM course_resources
       WHERE course_id = $1
       ORDER BY created_at DESC`,
      [courseId]
    );

    // 6. Enrolled Students
    const studentsRes = await pool.query(
      `SELECT e.id, e.user_id, e.name, e.email, e.mobile, e.trading_experience,
              e.batch_name, e.enrollment_status, e.payment_status, e.amount_paid,
              COALESCE(e.progress_percentage, 0) as progress_percentage,
              COALESCE(e.completed_lessons, 0) as completed_lessons,
              COALESCE(e.total_lessons, 16) as total_lessons,
              e.notes, e.created_at as enrolled_at
       FROM enrollments e
       WHERE e.course_id = $1
       ORDER BY e.created_at DESC`,
      [courseId]
    );

    // 7. Course Notifications
    const notifsRes = await pool.query(
      `SELECT id, course_id, batch_name, title, message, type, is_read, created_at
       FROM course_notifications
       WHERE course_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [courseId]
    );

    // 8. Progress and Reports Aggregates
    const totalEnrolled = studentsRes.rows.length;
    const completedPayments = studentsRes.rows.filter((s) => s.payment_status === 'completed');
    const totalRevenue = completedPayments.reduce((acc, s) => acc + (parseFloat(s.amount_paid) || 0), 0);
    const avgProgress = totalEnrolled > 0
      ? Math.round(studentsRes.rows.reduce((acc, s) => acc + (parseInt(s.progress_percentage, 10) || 0), 0) / totalEnrolled)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        course,
        modules: modulesRes.rows,
        lessons: lessonsRes.rows,
        liveClasses: liveRes.rows,
        announcements: announceRes.rows,
        resources: resourcesRes.rows,
        students: studentsRes.rows,
        notifications: notifsRes.rows,
        reports: {
          totalEnrolled,
          totalRevenue,
          averageProgress: avgProgress,
          totalLessons: lessonsRes.rows.length,
          upcomingLiveSessions: liveRes.rows.filter((l) => l.status === 'upcoming').length,
        },
      },
    });
  } catch (err) {
    console.error('[Admin Course Manage Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve course management data.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/videos/initiate-upload
 * Step 1 of Secure S3 Direct Upload:
 * Generates presigned S3 PUT URL (for files <= 100MB) or multipart uploadId (for files > 100MB)
 */
adminRouter.post('/courses/:courseId/videos/initiate-upload', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const {
      filename,
      contentType = 'video/mp4',
      fileSize = 0,
      batch_name = 'November',
      module_name = 'Core Curriculum',
      title,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Video title is required.' });
    }
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Video filename is required.' });
    }

    const courseRes = await pool.query('SELECT id, slug, batch_name FROM courses WHERE id = $1', [courseId]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }

    const videoId = Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    const cleanExt = path.extname(filename).toLowerCase() || '.mp4';
    const batchSlug = (batch_name || courseRes.rows[0].batch_name || 'general')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    const s3Key = `courses/${courseId}/batches/${batchSlug}/videos/${videoId}/original${cleanExt}`;

    const isMultipart = Number(fileSize) > 100 * 1024 * 1024;

    if (isMultipart) {
      const { uploadId } = await initiateMultipart({ key: s3Key, contentType });
      return res.status(200).json({
        success: true,
        uploadType: 'multipart',
        uploadId,
        s3Key,
        videoId,
        partSize: 10 * 1024 * 1024,
      });
    } else {
      const uploadUrl = await generatePresignedPutUrl({
        key: s3Key,
        contentType,
        expiresIn: 3600,
      });
      return res.status(200).json({
        success: true,
        uploadType: 'put',
        uploadUrl,
        s3Key,
        videoId,
      });
    }
  } catch (err) {
    console.error('[Admin S3 Initiate Upload Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to initiate video upload to S3.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/videos/multipart-part-url
 * Step 2 of Multipart Upload: Returns presigned URL for a single chunk
 */
adminRouter.post('/courses/:courseId/videos/multipart-part-url', async (req, res) => {
  try {
    const { s3Key, uploadId, partNumber } = req.body;
    if (!s3Key || !uploadId || !partNumber) {
      return res.status(400).json({ success: false, error: 'Missing multipart parameters.' });
    }
    const partUrl = await generatePresignedPartUrl({
      key: s3Key,
      uploadId,
      partNumber: parseInt(partNumber, 10),
      expiresIn: 3600,
    });
    return res.status(200).json({ success: true, partUrl });
  } catch (err) {
    console.error('[Admin Multipart Part URL Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate part upload URL.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/videos/complete-upload
 * Step 3 of Secure S3 Direct Upload:
 * Verifies S3 storage object via HeadObject and saves metadata to PostgreSQL
 */
adminRouter.post('/courses/:courseId/videos/complete-upload', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const {
      uploadType = 'put',
      s3Key,
      uploadId,
      parts,
      title,
      description = '',
      module_name = 'Core Curriculum',
      batch_name = 'November',
      duration_minutes = 30,
      sort_order = 1,
      release_at = null,
      is_published = true,
      original_filename,
      contentType = 'video/mp4',
      fileSize,
      lessonId = null,
    } = req.body;

    if (!s3Key) {
      return res.status(400).json({ success: false, error: 'S3 Key is required.' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Video title is required.' });
    }

    if (uploadType === 'multipart' && uploadId && parts) {
      await completeMultipart({ key: s3Key, uploadId, parts });
    }

    // Verify object in private S3 bucket
    const s3Meta = await verifyS3Object({ key: s3Key });
    if (!s3Meta.exists) {
      return res.status(400).json({
        success: false,
        error: 'Video could not be verified in AWS S3 storage. Upload may have failed or was interrupted.',
      });
    }

    const actualSize = s3Meta.contentLength || fileSize || 0;
    const actualType = s3Meta.contentType || contentType || 'video/mp4';

    let savedLesson;

    if (lessonId) {
      const updateRes = await pool.query(
        `UPDATE course_lessons
         SET s3_key = $1,
             original_filename = COALESCE($2, original_filename),
             content_type = $3,
             file_size = $4,
             title = COALESCE($5, title),
             description = COALESCE($6, description),
             module_name = COALESCE($7, module_name),
             batch_name = COALESCE($8, batch_name),
             duration_minutes = COALESCE($9, duration_minutes),
             sort_order = COALESCE($10, sort_order),
             release_at = $11,
             is_published = COALESCE($12, is_published),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $13 AND course_id = $14
         RETURNING *`,
        [
          s3Key,
          original_filename,
          actualType,
          actualSize,
          title.trim(),
          description,
          module_name.trim(),
          batch_name.trim(),
          parseInt(duration_minutes, 10) || 30,
          parseInt(sort_order, 10) || 1,
          release_at || null,
          Boolean(is_published),
          parseInt(lessonId, 10),
          courseId,
        ]
      );
      savedLesson = updateRes.rows[0];
    } else {
      const insertRes = await pool.query(
        `INSERT INTO course_lessons (
           course_id, module_name, title, description, s3_key,
           original_filename, content_type, file_size, duration_minutes,
           sort_order, batch_name, release_at, is_published, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          courseId,
          module_name.trim(),
          title.trim(),
          description ? description.trim() : null,
          s3Key,
          original_filename || 'video.mp4',
          actualType,
          actualSize,
          parseInt(duration_minutes, 10) || 30,
          parseInt(sort_order, 10) || 1,
          batch_name.trim(),
          release_at || null,
          Boolean(is_published),
          req.user?.id || null,
        ]
      );
      savedLesson = insertRes.rows[0];

      if (savedLesson.is_published) {
        await pool.query(
          `INSERT INTO course_notifications (course_id, title, message, type, reference_id, batch_name)
           VALUES ($1, $2, $3, 'lecture', $4, $5)`,
          [
            courseId,
            `New Video Uploaded: ${title.trim()}`,
            `A new recorded video lesson "${title.trim()}" has been published to S3 storage for your batch (${batch_name.trim()}).`,
            savedLesson.id,
            batch_name.trim(),
          ]
        );
      }
    }

    return res.status(200).json({ success: true, lesson: savedLesson });
  } catch (err) {
    console.error('[Admin Complete Upload Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to record video lesson in database.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/videos/abort-upload
 */
adminRouter.post('/courses/:courseId/videos/abort-upload', async (req, res) => {
  try {
    const { s3Key, uploadId } = req.body;
    if (s3Key && uploadId) {
      await abortMultipart({ key: s3Key, uploadId });
    }
    return res.status(200).json({ success: true, message: 'Multipart upload aborted.' });
  } catch (err) {
    console.error('[Admin Abort Upload Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to abort multipart upload.' });
  }
});

/**
 * GET /api/admin/courses/:courseId/videos/:lessonId/preview-url
 * Admin secure video preview using short-lived S3 Presigned URL
 */
adminRouter.get('/courses/:courseId/videos/:lessonId/preview-url', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const lessonId = parseInt(req.params.lessonId, 10);

    const lessonRes = await pool.query(
      'SELECT id, title, s3_key, video_url, content_type FROM course_lessons WHERE id = $1 AND course_id = $2',
      [lessonId, courseId]
    );

    if (lessonRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lesson not found.' });
    }

    const lesson = lessonRes.rows[0];
    if (lesson.s3_key) {
      const playbackUrl = await generatePresignedGetUrl({
        key: lesson.s3_key,
        contentType: lesson.content_type || 'video/mp4',
        expiresIn: 900,
      });
      return res.status(200).json({ success: true, playbackUrl, expiresIn: 900 });
    } else if (lesson.video_url) {
      return res.status(200).json({ success: true, playbackUrl: lesson.video_url, isDirect: true });
    }

    return res.status(404).json({ success: false, error: 'No video asset found for this lesson.' });
  } catch (err) {
    console.error('[Admin Preview URL Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate preview URL.' });
  }
});

/**
 * Course Modules Management
 */
adminRouter.post('/courses/:courseId/modules', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const { title, sort_order = 1 } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Module title is required.' });
    }
    const insertRes = await pool.query(
      'INSERT INTO course_modules (course_id, title, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [courseId, title.trim(), parseInt(sort_order, 10) || 1]
    );
    return res.status(201).json({ success: true, module: insertRes.rows[0] });
  } catch (err) {
    console.error('[Admin Add Module Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to create module.' });
  }
});

adminRouter.delete('/courses/:courseId/modules/:moduleId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const moduleId = parseInt(req.params.moduleId, 10);
    await pool.query('DELETE FROM course_modules WHERE id = $1 AND course_id = $2', [moduleId, courseId]);
    return res.status(200).json({ success: true, message: 'Module deleted.' });
  } catch (err) {
    console.error('[Admin Delete Module Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete module.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/lessons
 * Add recorded video lesson to course (Supports both S3 key and legacy URL)
 */
adminRouter.post('/courses/:courseId/lessons', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const {
      module_name = 'Core Curriculum',
      title,
      description = '',
      video_url = '',
      s3_key = null,
      batch_name = 'November',
      duration_minutes = 30,
      sort_order = 1,
      release_at = null,
      is_published = true,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Lesson title is required.' });
    }

    const insertRes = await pool.query(
      `INSERT INTO course_lessons (
         course_id, module_name, title, description, video_url, s3_key,
         batch_name, duration_minutes, sort_order, release_at, is_published, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        courseId,
        module_name.trim(),
        title.trim(),
        description ? description.trim() : null,
        video_url ? video_url.trim() : null,
        s3_key ? s3_key.trim() : null,
        batch_name ? batch_name.trim() : 'November',
        parseInt(duration_minutes, 10) || 30,
        parseInt(sort_order, 10) || 1,
        release_at || null,
        Boolean(is_published),
        req.user?.id || null,
      ]
    );

    const newLesson = insertRes.rows[0];

    // Auto-generate notification for enrolled students
    await pool.query(
      `INSERT INTO course_notifications (course_id, title, message, type, reference_id, batch_name)
       VALUES ($1, $2, $3, 'lecture', $4, $5)`,
      [
        courseId,
        `New Lecture Added: ${title.trim()}`,
        `A new recorded video lesson "${title.trim()}" is now available in your curriculum for ${batch_name}.`,
        newLesson.id,
        batch_name,
      ]
    );

    return res.status(201).json({ success: true, lesson: newLesson });
  } catch (err) {
    console.error('[Admin Add Lesson Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to add video lesson.' });
  }
});

/**
 * PUT /api/admin/courses/:courseId/lessons/:lessonId
 * Update recorded video lesson
 */
adminRouter.put('/courses/:courseId/lessons/:lessonId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const lessonId = parseInt(req.params.lessonId, 10);
    const {
      module_name,
      title,
      description,
      video_url,
      s3_key,
      batch_name,
      duration_minutes,
      sort_order,
      release_at,
      is_published,
    } = req.body;

    const updateRes = await pool.query(
      `UPDATE course_lessons
       SET module_name = COALESCE($1, module_name),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           video_url = COALESCE($4, video_url),
           s3_key = COALESCE($5, s3_key),
           batch_name = COALESCE($6, batch_name),
           duration_minutes = COALESCE($7, duration_minutes),
           sort_order = COALESCE($8, sort_order),
           release_at = $9,
           is_published = COALESCE($10, is_published),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND course_id = $12
       RETURNING *`,
      [
        module_name !== undefined ? module_name.trim() : null,
        title !== undefined ? title.trim() : null,
        description !== undefined ? description.trim() : null,
        video_url !== undefined ? video_url.trim() : null,
        s3_key !== undefined ? s3_key.trim() : null,
        batch_name !== undefined ? batch_name.trim() : null,
        duration_minutes !== undefined ? parseInt(duration_minutes, 10) : null,
        sort_order !== undefined ? parseInt(sort_order, 10) : null,
        release_at !== undefined ? release_at : null,
        is_published !== undefined ? Boolean(is_published) : null,
        lessonId,
        courseId,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lesson not found.' });
    }

    return res.status(200).json({ success: true, lesson: updateRes.rows[0] });
  } catch (err) {
    console.error('[Admin Update Lesson Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to update lesson.' });
  }
});

/**
 * DELETE /api/admin/courses/:courseId/lessons/:lessonId
 * Delete recorded video lesson and clean up S3 asset if present
 */
adminRouter.delete('/courses/:courseId/lessons/:lessonId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const lessonId = parseInt(req.params.lessonId, 10);

    const lessonRes = await pool.query(
      'SELECT id, s3_key FROM course_lessons WHERE id = $1 AND course_id = $2',
      [lessonId, courseId]
    );

    if (lessonRes.rows.length > 0 && lessonRes.rows[0].s3_key) {
      await deleteS3Object({ key: lessonRes.rows[0].s3_key });
    }

    await pool.query('DELETE FROM course_lessons WHERE id = $1 AND course_id = $2', [lessonId, courseId]);
    return res.status(200).json({ success: true, message: 'Lesson deleted.' });
  } catch (err) {
    console.error('[Admin Delete Lesson Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete lesson.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/live-classes
 * Schedule Google Meet Live Class for course
 */
adminRouter.post('/courses/:courseId/live-classes', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const {
      title,
      batch_name = 'November',
      scheduled_at,
      duration_minutes = 75,
      meeting_link,
      platform = 'Google Meet',
      instructor = 'Patil Trader',
      description = '',
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Live class title is required.' });
    }
    if (!scheduled_at) {
      return res.status(400).json({ success: false, error: 'Scheduled date and time is required.' });
    }

    const insertRes = await pool.query(
      `INSERT INTO live_classes (course_id, title, batch_name, scheduled_at, duration_minutes, meeting_link, platform, instructor, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'upcoming')
       RETURNING *`,
      [
        courseId,
        title.trim(),
        batch_name.trim(),
        scheduled_at,
        parseInt(duration_minutes, 10) || 75,
        meeting_link ? meeting_link.trim() : 'https://meet.google.com/trm-trdm-live',
        platform.trim(),
        instructor.trim(),
        description ? description.trim() : null,
      ]
    );

    const newClass = insertRes.rows[0];

    // Auto-generate notification for enrolled students
    await pool.query(
      `INSERT INTO course_notifications (course_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, 'live_class', $4)`,
      [
        courseId,
        `Live Class Scheduled: ${title.trim()}`,
        `Join Google Meet session scheduled for ${new Date(scheduled_at).toLocaleDateString()}. Meeting link is ready in Live Classes.`,
        newClass.id,
      ]
    );

    return res.status(201).json({ success: true, liveClass: newClass });
  } catch (err) {
    console.error('[Admin Add Live Class Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to schedule live class.' });
  }
});

/**
 * PUT /api/admin/courses/:courseId/live-classes/:sessionId
 * Update or reschedule live class
 */
adminRouter.put('/courses/:courseId/live-classes/:sessionId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const sessionId = parseInt(req.params.sessionId, 10);
    const {
      title,
      scheduled_at,
      duration_minutes,
      meeting_link,
      platform,
      instructor,
      description,
      status,
    } = req.body;

    const updateRes = await pool.query(
      `UPDATE live_classes
       SET title = COALESCE($1, title),
           scheduled_at = COALESCE($2, scheduled_at),
           duration_minutes = COALESCE($3, duration_minutes),
           meeting_link = COALESCE($4, meeting_link),
           platform = COALESCE($5, platform),
           instructor = COALESCE($6, instructor),
           description = COALESCE($7, description),
           status = COALESCE($8, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND course_id = $10
       RETURNING *`,
      [
        title !== undefined ? title.trim() : null,
        scheduled_at || null,
        duration_minutes !== undefined ? parseInt(duration_minutes, 10) : null,
        meeting_link !== undefined ? meeting_link.trim() : null,
        platform !== undefined ? platform.trim() : null,
        instructor !== undefined ? instructor.trim() : null,
        description !== undefined ? description.trim() : null,
        status !== undefined ? status.trim() : null,
        sessionId,
        courseId,
      ]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Live class session not found.' });
    }

    return res.status(200).json({ success: true, liveClass: updateRes.rows[0] });
  } catch (err) {
    console.error('[Admin Update Live Class Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to update live class.' });
  }
});

/**
 * DELETE /api/admin/courses/:courseId/live-classes/:sessionId
 * Delete live class
 */
adminRouter.delete('/courses/:courseId/live-classes/:sessionId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const sessionId = parseInt(req.params.sessionId, 10);

    await pool.query('DELETE FROM live_classes WHERE id = $1 AND course_id = $2', [sessionId, courseId]);
    return res.status(200).json({ success: true, message: 'Live class deleted.' });
  } catch (err) {
    console.error('[Admin Delete Live Class Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete live class.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/announcements
 * Publish course-specific announcement
 */
adminRouter.post('/courses/:courseId/announcements', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const {
      title,
      content,
      category = 'Update',
      author = 'Patil Trader',
    } = req.body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Title and content are required.' });
    }

    const insertRes = await pool.query(
      `INSERT INTO announcements (course_id, title, content, category, author, published_date, is_published)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, TRUE)
       RETURNING *`,
      [courseId, title.trim(), content.trim(), category.trim(), author.trim()]
    );

    const announcement = insertRes.rows[0];

    // Auto-generate notification for enrolled students
    await pool.query(
      `INSERT INTO course_notifications (course_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, 'announcement', $4)`,
      [
        courseId,
        `New Announcement: ${title.trim()}`,
        content.trim().length > 120 ? content.trim().substring(0, 117) + '...' : content.trim(),
        announcement.id,
      ]
    );

    return res.status(201).json({ success: true, announcement });
  } catch (err) {
    console.error('[Admin Course Announcement Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to publish announcement.' });
  }
});

/**
 * DELETE /api/admin/courses/:courseId/announcements/:announcementId
 * Delete course-specific announcement
 */
adminRouter.delete('/courses/:courseId/announcements/:announcementId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const announcementId = parseInt(req.params.announcementId, 10);

    await pool.query('DELETE FROM announcements WHERE id = $1 AND course_id = $2', [announcementId, courseId]);
    return res.status(200).json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    console.error('[Admin Delete Announcement Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete announcement.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/resources
 * Upload or attach post/note/PDF/assignment to course
 */
adminRouter.post('/courses/:courseId/resources', upload.single('file'), async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const {
      title,
      description = '',
      resource_type = 'pdf',
      resource_url: rawUrl,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Resource title is required.' });
    }

    let finalUrl = rawUrl ? rawUrl.trim() : '';
    let fileName = null;
    let fileSize = null;

    if (req.file) {
      finalUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
      const sizeBytes = req.file.size;
      fileSize = sizeBytes > 1024 * 1024
        ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(sizeBytes / 1024)} KB`;
    }

    if (!finalUrl && !req.file) {
      finalUrl = '#';
    }

    const insertRes = await pool.query(
      `INSERT INTO course_resources (course_id, title, description, resource_type, resource_url, file_name, file_size, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        courseId,
        title.trim(),
        description ? description.trim() : null,
        resource_type.trim(),
        finalUrl,
        fileName,
        fileSize,
        req.user.id,
      ]
    );

    const resource = insertRes.rows[0];

    // Auto-generate notification for enrolled students
    await pool.query(
      `INSERT INTO course_notifications (course_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, 'resource', $4)`,
      [
        courseId,
        `New Resource Uploaded: ${title.trim()}`,
        `A new resource is available for download in Posts & Resources.`,
        resource.id,
      ]
    );

    return res.status(201).json({ success: true, resource });
  } catch (err) {
    console.error('[Admin Resource Upload Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to upload resource.' });
  }
});

/**
 * DELETE /api/admin/courses/:courseId/resources/:resourceId
 * Delete resource from course
 */
adminRouter.delete('/courses/:courseId/resources/:resourceId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const resourceId = parseInt(req.params.resourceId, 10);

    // Optionally remove local file if in /uploads
    const resRow = await pool.query('SELECT resource_url FROM course_resources WHERE id = $1 AND course_id = $2', [resourceId, courseId]);
    if (resRow.rows.length > 0 && resRow.rows[0].resource_url && resRow.rows[0].resource_url.startsWith('/uploads/')) {
      const filePath = path.resolve(uploadDir, path.basename(resRow.rows[0].resource_url));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await pool.query('DELETE FROM course_resources WHERE id = $1 AND course_id = $2', [resourceId, courseId]);
    return res.status(200).json({ success: true, message: 'Resource deleted.' });
  } catch (err) {
    console.error('[Admin Delete Resource Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete resource.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/enroll
 * Authorized Admin Manual Enrollment into this Course
 */
adminRouter.post('/courses/:courseId/enroll', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const {
      name,
      email,
      mobile = '',
      trading_experience = 'Beginner',
      notes = 'Admin Enrollment',
    } = req.body;

    if (!name || !name.trim() || !email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Verify course exists
    const courseRes = await pool.query('SELECT * FROM courses WHERE id = $1 LIMIT 1', [courseId]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }
    const course = courseRes.rows[0];

    // Find or create student user
    let userRow = null;
    const userCheck = await pool.query('SELECT id, name, email FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
    if (userCheck.rows.length > 0) {
      userRow = userCheck.rows[0];
    } else {
      const defaultPassword = await bcrypt.hash('TradeMax@2026', 10);
      const newUserRes = await pool.query(
        `INSERT INTO users (name, email, mobile, trading_experience, password, role, status)
         VALUES ($1, $2, $3, $4, $5, 'student', 'active')
         RETURNING id, name, email`,
        [cleanName, cleanEmail, mobile.trim(), trading_experience, defaultPassword]
      );
      userRow = newUserRes.rows[0];
    }

    // Check if already enrolled in this course
    const existingEnroll = await pool.query(
      `SELECT id FROM enrollments WHERE course_id = $1 AND (user_id = $2 OR LOWER(email) = $3) LIMIT 1`,
      [courseId, userRow.id, cleanEmail]
    );

    if (existingEnroll.rows.length > 0) {
      // Re-activate if needed
      await pool.query(
        `UPDATE enrollments
         SET enrollment_status = 'enrolled', payment_status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [existingEnroll.rows[0].id]
      );
      return res.status(200).json({ success: true, message: 'Student enrollment reactivated.' });
    }

    // Insert new verified enrollment
    const newEnrollRes = await pool.query(
      `INSERT INTO enrollments (
        user_id, course_id, course_name, name, email, mobile,
        trading_experience, batch_name, enrollment_status, payment_status,
        amount_paid, progress_percentage, completed_lessons, total_lessons, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'enrolled', 'completed', $9, 0, 0, 16, $10)
      RETURNING *`,
      [
        userRow.id,
        courseId,
        course.title,
        cleanName,
        cleanEmail,
        mobile.trim(),
        trading_experience,
        course.batch_name || 'November',
        course.price || 0,
        notes.trim(),
      ]
    );

    // Welcome Notification
    await pool.query(
      `INSERT INTO course_notifications (course_id, user_id, title, message, type)
       VALUES ($1, $2, $3, $4, 'general')`,
      [
        courseId,
        userRow.id,
        `Welcome to ${course.title}!`,
        `Your enrollment has been approved. You now have full access to live classes, recorded lessons, and course notes.`,
      ]
    );

    return res.status(201).json({ success: true, enrollment: newEnrollRes.rows[0] });
  } catch (err) {
    console.error('[Admin Enroll Student Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to enroll student.' });
  }
});

/**
 * DELETE /api/admin/courses/:courseId/students/:enrollmentId
 * Remove or revoke student enrollment
 */
adminRouter.delete('/courses/:courseId/students/:enrollmentId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const enrollmentId = parseInt(req.params.enrollmentId, 10);

    await pool.query('DELETE FROM enrollments WHERE id = $1 AND course_id = $2', [enrollmentId, courseId]);
    return res.status(200).json({ success: true, message: 'Enrollment removed.' });
  } catch (err) {
    console.error('[Admin Remove Enrollment Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to remove enrollment.' });
  }
});

/**
 * POST /api/admin/courses/:courseId/notifications
 * Broadcast custom notification to all students enrolled in this course
 */
adminRouter.post('/courses/:courseId/notifications', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId, 10);
    const { title, message, type = 'general' } = req.body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Title and message are required.' });
    }

    const insertRes = await pool.query(
      `INSERT INTO course_notifications (course_id, title, message, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [courseId, title.trim(), message.trim(), type.trim()]
    );

    return res.status(201).json({ success: true, notification: insertRes.rows[0] });
  } catch (err) {
    console.error('[Admin Send Notification Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to send notification.' });
  }
});

// ============================================================================
// 10. MANUAL PAYMENT CLAIMS VERIFICATION & ADMIN AUDIT
// ============================================================================

const qrMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * GET /api/admin/payment-claims
 * Lists student manual payment claims with search, filters, pagination, and stats summary
 */
adminRouter.get('/payment-claims', async (req, res) => {
  try {
    const {
      status = 'all',
      courseId = 'all',
      search = '',
      page = 1,
      limit = 10,
      sort = 'newest',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const searchPattern = `%${search.trim().toLowerCase()}%`;

    // 1. Fetch Summary Stats for Tabs / Badges
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as under_review,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected
      FROM manual_payment_claims
    `);
    const summaryStats = {
      total: parseInt(statsRes.rows[0].total, 10) || 0,
      pending: parseInt(statsRes.rows[0].pending, 10) || 0,
      under_review: parseInt(statsRes.rows[0].under_review, 10) || 0,
      approved: parseInt(statsRes.rows[0].approved, 10) || 0,
      rejected: parseInt(statsRes.rows[0].rejected, 10) || 0,
    };

    // 2. Build Dynamic Query Filters
    const whereClauses = [];
    const values = [];
    let idx = 1;

    if (status !== 'all') {
      whereClauses.push(`mpc.status = $${idx++}`);
      values.push(status.toUpperCase());
    }

    if (courseId !== 'all') {
      whereClauses.push(`mpc.course_id = $${idx++}`);
      values.push(parseInt(courseId, 10));
    }

    if (search.trim()) {
      whereClauses.push(`(
        LOWER(u.name) LIKE $${idx} OR
        LOWER(u.email) LIKE $${idx} OR
        COALESCE(u.mobile, '') LIKE $${idx} OR
        LOWER(mpc.transaction_ref) LIKE $${idx} OR
        LOWER(mpc.claim_id) LIKE $${idx}
      )`);
      values.push(searchPattern);
      idx++;
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const orderDirection = sort === 'oldest' ? 'ASC' : 'DESC';

    // 3. Count Total Matching Rows
    const countRes = await pool.query(
      `SELECT COUNT(*) as count
       FROM manual_payment_claims mpc
       INNER JOIN users u ON mpc.user_id = u.id
       INNER JOIN courses c ON mpc.course_id = c.id
       ${whereStr}`,
      values
    );
    const totalMatching = parseInt(countRes.rows[0].count, 10) || 0;

    // 4. Fetch Paginated Records
    const queryValues = [...values, limitNum, offset];
    const claimsRes = await pool.query(
      `SELECT mpc.id, mpc.claim_id, mpc.amount, mpc.currency, mpc.transaction_ref,
              mpc.status, mpc.student_notes, mpc.rejection_reason, mpc.admin_notes,
              mpc.created_at, mpc.reviewed_at, mpc.screenshot_mime_type,
              u.id as user_id, u.name as student_name, u.email as student_email,
              u.mobile as student_mobile, u.trading_experience,
              c.id as course_id, c.title as course_title, c.slug as course_slug,
              c.price as course_price, c.batch_name as course_batch,
              admin_u.name as reviewer_name, admin_u.email as reviewer_email
       FROM manual_payment_claims mpc
       INNER JOIN users u ON mpc.user_id = u.id
       INNER JOIN courses c ON mpc.course_id = c.id
       LEFT JOIN users admin_u ON mpc.reviewed_by = admin_u.id
       ${whereStr}
       ORDER BY mpc.created_at ${orderDirection}
       LIMIT $${idx++} OFFSET $${idx++}`,
      queryValues
    );

    const claims = claimsRes.rows.map((row) => ({
      ...row,
      screenshot_url: `/api/admin/payment-claims/${row.id}/screenshot`,
    }));

    return res.status(200).json({
      success: true,
      stats: summaryStats,
      claims,
      pagination: {
        total: totalMatching,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalMatching / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('[Admin Get Payment Claims Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve manual payment claims.',
    });
  }
});

/**
 * GET /api/admin/payment-claims/:id
 * Retrieve full details of a specific payment claim
 */
adminRouter.get('/payment-claims/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const claimRes = await pool.query(
      `SELECT mpc.*,
              u.name as student_name, u.email as student_email, u.mobile as student_mobile,
              u.trading_experience, u.role as student_role,
              c.title as course_title, c.slug as course_slug, c.price as course_price,
              c.batch_name as course_batch, c.thumbnail as course_thumbnail,
              admin_u.name as reviewer_name, admin_u.email as reviewer_email
       FROM manual_payment_claims mpc
       INNER JOIN users u ON mpc.user_id = u.id
       INNER JOIN courses c ON mpc.course_id = c.id
       LEFT JOIN users admin_u ON mpc.reviewed_by = admin_u.id
       WHERE (mpc.id::text = $1 OR mpc.claim_id = $1)
       LIMIT 1`,
      [id]
    );

    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment claim not found.' });
    }

    const claim = claimRes.rows[0];

    return res.status(200).json({
      success: true,
      claim: {
        ...claim,
        screenshot_url: `/api/admin/payment-claims/${claim.id}/screenshot`,
      },
    });
  } catch (err) {
    console.error('[Admin Single Claim Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to load claim details.' });
  }
});

/**
 * GET /api/admin/payment-claims/:id/screenshot
 * Securely stream payment screenshot to authorized admin
 */
adminRouter.get('/payment-claims/:id/screenshot', async (req, res) => {
  try {
    const { id } = req.params;

    const claimRes = await pool.query(
      `SELECT screenshot_path, screenshot_mime_type
       FROM manual_payment_claims
       WHERE (id::text = $1 OR claim_id = $1)
       LIMIT 1`,
      [id]
    );

    if (claimRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment claim not found.' });
    }

    const claim = claimRes.rows[0];
    const filePath = getPrivateScreenshotFilePath(claim.screenshot_path);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Screenshot image file was not found on server storage.',
      });
    }

    res.setHeader('Content-Type', claim.screenshot_mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'private, no-store');
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[Admin Stream Screenshot Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to stream screenshot.' });
  }
});

/**
 * PATCH /api/admin/payment-claims/:id/under-review
 * Transition claim state from PENDING to UNDER_REVIEW
 */
adminRouter.patch('/payment-claims/:id/under-review', async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const updateRes = await pool.query(
      `UPDATE manual_payment_claims
       SET status = 'UNDER_REVIEW',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE (id::text = $2 OR claim_id = $2) AND status = 'PENDING'
       RETURNING *`,
      [adminId, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Claim must be in PENDING status to mark as under review.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment claim marked as under review.',
      claim: updateRes.rows[0],
    });
  } catch (err) {
    console.error('[Admin Mark Under Review Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to update claim status.' });
  }
});

/**
 * POST /api/admin/payment-claims/:id/approve
 * Explicit authenticated administrator approval:
 * - Atomic PostgreSQL transaction with row-level lock (FOR UPDATE)
 * - Verifies claim eligibility (PENDING or UNDER_REVIEW)
 * - Enrolls student in PostgreSQL enrollments table
 * - Decrements course seat count
 * - Records audit trail (reviewed_by, reviewed_at, admin_notes)
 * - Sends student in-app notification
 */
adminRouter.post('/payment-claims/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { admin_notes = '' } = req.body;

    await client.query('BEGIN');

    // Lock the claim row to prevent concurrent race condition approvals
    const claimRes = await client.query(
      `SELECT mpc.*, u.name as student_name, u.email as student_email, u.mobile as student_mobile,
              u.trading_experience, c.title as course_title, c.batch_name as course_batch
       FROM manual_payment_claims mpc
       INNER JOIN users u ON mpc.user_id = u.id
       INNER JOIN courses c ON mpc.course_id = c.id
       WHERE (mpc.id::text = $1 OR mpc.claim_id = $1)
       FOR UPDATE`,
      [id]
    );

    if (claimRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Payment claim not found.' });
    }

    const claim = claimRes.rows[0];

    if (claim.status === 'APPROVED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'This payment claim has already been approved and cannot be approved again.',
      });
    }

    if (claim.status === 'REJECTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'This claim was rejected. The student must resubmit payment evidence before approval.',
      });
    }

    // Check for existing enrollment to prevent double enrollment
    let enrollmentId = null;
    const existingEnrollCheck = await client.query(
      `SELECT id, enrollment_status, payment_status
       FROM enrollments
       WHERE user_id = $1 AND course_id = $2
       LIMIT 1`,
      [claim.user_id, claim.course_id]
    );

    if (existingEnrollCheck.rows.length > 0) {
      enrollmentId = existingEnrollCheck.rows[0].id;
      // Reactivate or confirm enrollment
      await client.query(
        `UPDATE enrollments
         SET enrollment_status = 'enrolled',
             payment_status = 'completed',
             amount_paid = $1,
             payment_method = 'manual_upi',
             transaction_id = $2,
             claim_id = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [claim.amount, claim.transaction_ref, claim.claim_id, enrollmentId]
      );
    } else {
      // Create new verified enrollment
      const insertEnrollRes = await client.query(
        `INSERT INTO enrollments (
          user_id, course_id, course_name, name, email, mobile,
          trading_experience, batch_name, enrollment_status,
          payment_status, amount_paid, payment_method, transaction_id, claim_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'enrolled', 'completed', $9, 'manual_upi', $10, $11)
        RETURNING id`,
        [
          claim.user_id,
          claim.course_id,
          claim.course_title,
          claim.student_name,
          claim.student_email,
          claim.student_mobile || '',
          claim.trading_experience || 'Intermediate',
          claim.course_batch || 'November',
          claim.amount,
          claim.transaction_ref,
          claim.claim_id,
        ]
      );
      enrollmentId = insertEnrollRes.rows[0].id;

      // Safely decrement available seats in courses table
      await client.query(
        `UPDATE courses
         SET seats_available = GREATEST(0, seats_available - 1),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND seats_available > 0`,
        [claim.course_id]
      );
    }

    // Update manual_payment_claims row
    const updateClaimRes = await client.query(
      `UPDATE manual_payment_claims
       SET status = 'APPROVED',
           enrollment_id = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           admin_notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [enrollmentId, adminId, admin_notes ? admin_notes.trim() : null, claim.id]
    );

    // Synchronize to unified payments audit table
    await client.query(
      `INSERT INTO payments (
        user_id, course_id, enrollment_id, order_id, payment_id,
        amount, currency, status, method, customer_name, customer_email, customer_mobile, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, 'INR', 'captured', 'manual_upi', $7, $8, $9, $10)
      ON CONFLICT (order_id) DO UPDATE SET
        enrollment_id = EXCLUDED.enrollment_id,
        payment_id = EXCLUDED.payment_id,
        status = 'captured',
        updated_at = CURRENT_TIMESTAMP`,
      [
        claim.user_id,
        claim.course_id,
        enrollmentId,
        `manual_ord_${claim.claim_id}`,
        claim.transaction_ref,
        claim.amount,
        claim.student_name,
        claim.student_email,
        claim.student_mobile || '',
        JSON.stringify({
          claim_id: claim.claim_id,
          verified_by_admin: adminId,
          approved_at: new Date().toISOString(),
          admin_notes,
        }),
      ]
    );

    // Notify student in dashboard
    await client.query(
      `INSERT INTO course_notifications (course_id, user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, 'payment_approved', $5)`,
      [
        claim.course_id,
        claim.user_id,
        'Payment Verified & Approved',
        `Your manual payment of ₹${claim.amount} for "${claim.course_title}" has been verified. Your enrollment is active and you now have full access to your course.`,
        claim.id,
      ]
    );

    await client.query('COMMIT');

    console.log(`[Admin Payment Approved]: Claim ${claim.claim_id} approved by admin #${adminId} for user #${claim.user_id}`);

    return res.status(200).json({
      success: true,
      message: `Payment claim ${claim.claim_id} approved successfully. Student enrolled in ${claim.course_title}.`,
      claim: updateClaimRes.rows[0],
      enrollmentId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Admin Approve Payment Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to approve payment claim and grant course enrollment.',
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/payment-claims/:id/reject
 * Explicit authenticated administrator rejection with mandatory reason
 */
adminRouter.post('/payment-claims/:id/reject', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const { rejection_reason, admin_notes = '' } = req.body;

    if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'A clear rejection reason (at least 5 characters) is required when rejecting a payment claim.',
      });
    }

    await client.query('BEGIN');

    // Row-level lock
    const claimRes = await client.query(
      `SELECT mpc.*, c.title as course_title
       FROM manual_payment_claims mpc
       INNER JOIN courses c ON mpc.course_id = c.id
       WHERE (mpc.id::text = $1 OR mpc.claim_id = $1)
       FOR UPDATE`,
      [id]
    );

    if (claimRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Payment claim not found.' });
    }

    const claim = claimRes.rows[0];

    if (claim.status === 'APPROVED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Cannot reject an already approved payment claim.',
      });
    }

    const cleanReason = rejection_reason.trim();

    const updateClaimRes = await client.query(
      `UPDATE manual_payment_claims
       SET status = 'REJECTED',
           rejection_reason = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           admin_notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [cleanReason, adminId, admin_notes ? admin_notes.trim() : null, claim.id]
    );

    // Notify student in dashboard
    await client.query(
      `INSERT INTO course_notifications (course_id, user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, 'payment_rejected', $5)`,
      [
        claim.course_id,
        claim.user_id,
        'Payment Claim Update',
        `Your payment claim for "${claim.course_title}" could not be verified. Reason: ${cleanReason}. You can review and resubmit your payment evidence from My Payments in your student portal.`,
        claim.id,
      ]
    );

    await client.query('COMMIT');

    console.log(`[Admin Payment Rejected]: Claim ${claim.claim_id} rejected by admin #${adminId}. Reason: ${cleanReason}`);

    return res.status(200).json({
      success: true,
      message: 'Payment claim has been rejected.',
      claim: updateClaimRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Admin Reject Payment Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to reject payment claim.' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/admin/payment-settings
 * Retrieve current payment configuration for admin dashboard
 */
adminRouter.get('/payment-settings', async (req, res) => {
  try {
    const configRes = await pool.query(
      `SELECT ps.*, u.name as updated_by_name, u.email as updated_by_email
       FROM payment_settings ps
       LEFT JOIN users u ON ps.updated_by = u.id
       WHERE ps.id = 1
       LIMIT 1`
    );

    if (configRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payment settings not found.' });
    }

    return res.status(200).json({
      success: true,
      settings: configRes.rows[0],
    });
  } catch (err) {
    console.error('[Admin Get Payment Settings Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch payment settings.' });
  }
});

/**
 * PUT /api/admin/payment-settings
 * Update recipient name, UPI ID, instructions, and toggle manual payments
 */
adminRouter.put('/payment-settings', async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      is_manual_enabled,
      is_active,
      recipient_name,
      upi_id,
      instructions,
      payment_instructions,
      qr_code_url,
    } = req.body;

    const manualEnabled = is_manual_enabled !== undefined
      ? Boolean(is_manual_enabled)
      : (is_active !== undefined ? Boolean(is_active) : true);

    const finalInstructions = instructions !== undefined ? instructions : (payment_instructions || '');

    if (!recipient_name || !recipient_name.trim()) {
      return res.status(400).json({ success: false, error: 'Payment recipient name is required.' });
    }

    if (manualEnabled && (!qr_code_url || !qr_code_url.trim()) && (!upi_id || !upi_id.trim())) {
      const currentRes = await pool.query('SELECT qr_code_url FROM payment_settings WHERE id = 1 LIMIT 1');
      const hasExistingQr = Boolean(currentRes.rows[0]?.qr_code_url);
      if (!hasExistingQr) {
        return res.status(400).json({
          success: false,
          error: 'Either a Payment QR Code or UPI ID is required to enable manual payments.',
        });
      }
    }

    const cleanRecipient = recipient_name.trim();
    const cleanUpi = upi_id ? upi_id.trim() : '';
    const cleanInstructions = finalInstructions ? finalInstructions.trim() : '';

    const updateRes = await pool.query(
      `UPDATE payment_settings
       SET is_manual_enabled = $1,
           recipient_name = $2,
           upi_id = $3,
           instructions = $4,
           qr_code_url = COALESCE($5, qr_code_url),
           updated_by = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING *`,
      [
        Boolean(manualEnabled),
        cleanRecipient,
        cleanUpi,
        cleanInstructions,
        qr_code_url ? qr_code_url.trim() : null,
        adminId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Payment configuration saved successfully.',
      settings: updateRes.rows[0],
    });
  } catch (err) {
    console.error('[Admin Update Payment Settings Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to update payment settings.' });
  }
});

/**
 * POST /api/admin/payment-settings/upload-qr
 * Upload or replace the official payment QR code image
 */
adminRouter.post('/payment-settings/upload-qr', (req, res, next) => {
  qrMemoryUpload.single('qr_image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'QR image must be under 10MB.' });
      }
      return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const adminId = req.user.id;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: 'QR image file is required.' });
    }

    const saved = await saveAdminQrCode({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
    });

    const updateRes = await pool.query(
      `UPDATE payment_settings
       SET qr_code_url = $1,
           qr_code_storage_key = $2,
           updated_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING *`,
      [saved.url, saved.storageKey, adminId]
    );

    return res.status(200).json({
      success: true,
      message: 'Official QR code image updated successfully.',
      qr_code_url: saved.url,
      settings: updateRes.rows[0],
    });
  } catch (err) {
    console.error('[Admin Upload QR Error]:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to upload QR code image.',
    });
  }
});

