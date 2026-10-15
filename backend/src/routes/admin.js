import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { adminMiddleware } from '../middleware/admin.js';

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
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Course title is required.' });
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
        seats_available, is_published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Course title is required.' });
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
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
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
        contactPhone: settings.contact_phone || '8799026206',
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
