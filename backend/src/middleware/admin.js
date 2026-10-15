import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export const adminMiddleware = async (req, res, next) => {
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
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in as administrator.',
      });
    }

    const secret = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';
    const decoded = jwt.verify(token, secret);

    // Verify user role in database for real-time security
    const result = await pool.query(
      'SELECT id, name, email, role, status FROM users WHERE id = $1 LIMIT 1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Account not found.',
      });
    }

    const dbUser = result.rows[0];

    if (dbUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Administrator privileges required.',
      });
    }

    req.user = dbUser;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired. Please sign in again.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing authentication token.',
    });
  }
};
