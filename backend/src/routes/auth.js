import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

export const authRouter = Router();

const VALID_EXPERIENCES = ['Beginner', 'Intermediate', 'Advanced', 'Professional'];

// Generate JWT token
const signToken = (user) => {
  const secret = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'student',
    },
    secret,
    { expiresIn }
  );
};

// ============================================================================
// REGISTER (POST /api/auth/register)
// ============================================================================
authRouter.post('/register', async (req, res) => {
  try {
    const { name, mobile, email, reference, password, trading_experience } = req.body;

    // 1. Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }

    if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
    }

    // Trading experience validation
    const experienceValue = trading_experience && VALID_EXPERIENCES.includes(trading_experience)
      ? trading_experience
      : 'Intermediate';

    const normalizedEmail = email.trim().toLowerCase();
    const cleanMobile = mobile ? String(mobile).trim() : null;
    const cleanReference = reference ? String(reference).trim() : null;

    // 2. Check for duplicate email
    const duplicateCheck = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please sign in instead.',
      });
    }

    // 3. Hash password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Save to PostgreSQL
    const insertResult = await pool.query(
      `INSERT INTO users (
        name,
        mobile,
        email,
        reference,
        trading_experience,
        password,
        role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, mobile, email, reference, trading_experience, role, has_seen_welcome, created_at`,
      [
        name.trim(),
        cleanMobile,
        normalizedEmail,
        cleanReference,
        experienceValue,
        hashedPassword,
        'student',
      ]
    );

    const newUser = insertResult.rows[0];

    // 5. Generate token & set cookie
    const token = signToken(newUser);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: newUser,
      token,
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while creating your account. Please try again.',
    });
  }
});

// ============================================================================
// LOGIN (POST /api/auth/login)
// ============================================================================
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const identifier = String(email).trim().toLowerCase();

    // Query user by email or mobile
    const userQuery = await pool.query(
      `SELECT id, name, mobile, email, reference, trading_experience, password, role, has_seen_welcome, created_at
       FROM users
       WHERE LOWER(email) = $1 OR mobile = $2
       LIMIT 1`,
      [identifier, email.trim()]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email and password.',
      });
    }

    const user = userQuery.rows[0];

    // Compare bcrypt password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please check your email and password.',
      });
    }

    // Strip password from returned user object
    delete user.password;

    // Generate token & set cookie
    const token = signToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      user,
      token,
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during sign in. Please try again.',
    });
  }
});

// ============================================================================
// ME / VERIFY SESSION (GET /api/auth/me) - Session Verification Route
// ============================================================================
authRouter.get('/me', async (req, res) => {
  try {
    let token = null;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(200).json({
        success: true,
        user: null,
      });
    }

    const secret = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(200).json({
        success: true,
        user: null,
      });
    }

    const userQuery = await pool.query(
      `SELECT id, name, mobile, email, reference, trading_experience, role, has_seen_welcome, created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [decoded.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(200).json({
        success: true,
        user: null,
      });
    }

    return res.status(200).json({
      success: true,
      user: userQuery.rows[0],
    });
  } catch (err) {
    console.error('[Auth Me Error]:', err);
    return res.status(200).json({
      success: true,
      user: null,
    });
  }
});

// ============================================================================
// MARK WELCOME SEEN (POST /api/auth/mark-welcome-seen) - Protected Route
// ============================================================================
authRouter.post('/mark-welcome-seen', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users
       SET has_seen_welcome = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Welcome animation marked as completed.',
    });
  } catch (err) {
    console.error('[Mark Welcome Seen Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Could not update welcome status.',
    });
  }
});

// ============================================================================
// UPDATE PROFILE (PUT /api/auth/profile) - Protected Route
// ============================================================================
authRouter.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, mobile, trading_experience } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Full name is required.',
      });
    }

    const experienceValue = trading_experience && VALID_EXPERIENCES.includes(trading_experience)
      ? trading_experience
      : 'Intermediate';

    const cleanMobile = mobile ? String(mobile).trim() : null;

    const result = await pool.query(
      `UPDATE users
       SET name = $1, mobile = $2, trading_experience = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, mobile, email, reference, trading_experience, role, has_seen_welcome, created_at`,
      [name.trim(), cleanMobile, experienceValue, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('[Update Profile Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while updating profile.',
    });
  }
});

// ============================================================================
// CHANGE PASSWORD (PUT /api/auth/password) - Protected Route
// ============================================================================
authRouter.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required.',
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long.',
      });
    }

    // Verify current password
    const userRes = await pool.query('SELECT password FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Incorrect current password.',
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashed, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    console.error('[Change Password Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while changing password.',
    });
  }
});

// ============================================================================
// RESET / CREATE NEW PASSWORD (POST /api/auth/reset-password)
// ============================================================================
authRouter.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email and new password are required.',
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRes = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [normalizedEmail]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address.',
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashed, userRes.rows[0].id]
    );

    return res.status(200).json({
      success: true,
      message: 'New password created successfully! You can now log in.',
    });
  } catch (err) {
    console.error('[Reset Password Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while setting new password.',
    });
  }
});

// ============================================================================
// LOGOUT (POST /api/auth/logout)
// ============================================================================
authRouter.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});
