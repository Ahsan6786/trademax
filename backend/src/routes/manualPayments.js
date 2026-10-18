import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  savePrivateScreenshot,
  getPrivateScreenshotFilePath,
  getQrCodeFilePath,
} from '../services/storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const manualPaymentsRouter = Router();

// Memory storage for inspecting file buffers before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const allowedExt = /\.(jpe?g|png|webp)$/i;
    const mime = (file.mimetype || '').toLowerCase();
    if (allowedMime.includes(mime) || allowedExt.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

/**
 * Normalizes and validates a UPI Transaction Reference / UTR number.
 */
export function normalizeAndValidateUtr(rawRef) {
  if (!rawRef || typeof rawRef !== 'string') {
    return { valid: false, error: 'Transaction reference / UTR number is required.' };
  }

  // Strip all whitespace, tabs, and newlines from user input or pasted strings
  const normalized = rawRef.trim().toUpperCase().replace(/\s+/g, '');

  // Typical Indian UPI UTR is 12 digits, but banking reference numbers can range from 8 to 35 alphanumeric characters
  if (normalized.length < 8 || normalized.length > 35) {
    return {
      valid: false,
      error: 'Transaction reference must be between 8 and 35 characters long.',
    };
  }

  // Allowed characters: letters, numbers, hyphens, and slashes
  if (!/^[A-Z0-9\-_/]+$/.test(normalized)) {
    return {
      valid: false,
      error: 'Transaction reference contains invalid characters. Only alphanumeric characters, hyphens, and slashes are allowed.',
    };
  }

  return { valid: true, normalized };
}

/**
 * GET /api/payments/manual-config
 * Public configuration endpoint for student checkout:
 * Returns the active QR code, verified recipient name, UPI ID, and payment instructions.
 * If not configured or disabled by admin, isConfigured returns false.
 */
manualPaymentsRouter.get('/manual-config', async (req, res) => {
  try {
    const settingsRes = await pool.query(
      'SELECT id, is_manual_enabled, qr_code_url, recipient_name, upi_id, instructions, updated_at FROM payment_settings WHERE id = 1 LIMIT 1'
    );

    if (settingsRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        isConfigured: false,
        enabled: false,
        message: 'Payment configuration has not been initialized.',
      });
    }

    const config = settingsRes.rows[0];
    const hasQr = Boolean(config.qr_code_url && config.qr_code_url.trim());
    const hasRecipient = Boolean(config.recipient_name && config.recipient_name.trim());
    const isManualEnabled = Boolean(config.is_manual_enabled);

    // Verify qr.jpg exists if configured to use /qr.jpg
    let qrExists = true;
    if (config.qr_code_url === '/qr.jpg') {
      const publicQrPath = path.resolve(__dirname, '../../../public/qr.jpg');
      const distQrPath = path.resolve(__dirname, '../../../dist/qr.jpg');
      const wwwQrPath = '/var/www/trademax/qr.jpg';
      qrExists = fs.existsSync(publicQrPath) || fs.existsSync(distQrPath) || fs.existsSync(wwwQrPath);
    } else if (config.qr_code_url && config.qr_code_url.startsWith('/api/payments/qr-image/')) {
      const filename = config.qr_code_url.replace('/api/payments/qr-image/', '');
      const filePath = getQrCodeFilePath(filename);
      qrExists = Boolean(filePath && fs.existsSync(filePath));
    }

    const isConfigured = isManualEnabled && hasQr && hasRecipient && qrExists;

    return res.status(200).json({
      success: true,
      enabled: isManualEnabled,
      isConfigured,
      qr_code_url: config.qr_code_url,
      recipient_name: config.recipient_name,
      upi_id: config.upi_id || '',
      instructions: config.instructions,
      error_message: !isConfigured
        ? !isManualEnabled
          ? 'Manual UPI payment is currently paused by TradeMax Admissions.'
          : !qrExists
          ? 'Official payment QR code asset is missing or unreadable.'
          : 'Payment details are being configured. Please contact admissions at 8799026206.'
        : null,
    });
  } catch (err) {
    console.error('[Payment Manual Config Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment configuration.',
    });
  }
});

/**
 * GET /api/payments/qr-image/:filename
 * Serves an admin-uploaded custom QR code image securely with correct headers.
 */
manualPaymentsRouter.get('/qr-image/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = getQrCodeFilePath(filename);

    if (!filePath) {
      return res.status(404).json({ success: false, error: 'QR code image not found.' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[QR Image Serve Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to stream QR image.' });
  }
});

/**
 * POST /api/payments/manual-claim
 * Authenticated student payment claim submission:
 * - Requires authenticated student
 * - Resolves course and authoritative price from PostgreSQL (never trusts frontend price)
 * - Verifies manual payments are enabled and active
 * - Validates UTR / transaction reference and checks uniqueness
 * - Validates uploaded screenshot (magic bytes, size, format) and saves privately
 * - Checks for duplicate active claims or existing enrollments
 * - Creates claim with status 'PENDING'
 */
manualPaymentsRouter.post(
  '/manual-claim',
  authMiddleware,
  (req, res, next) => {
    upload.single('screenshot')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'Payment screenshot is too large. Maximum allowed size is 10MB.',
          });
        }
        return res.status(400).json({ success: false, error: err.message });
      } else if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.id;
      const userEmail = (req.user.email || '').toLowerCase().trim();

      const course_id = req.body.course_id || req.body.courseId;
      const course_slug = req.body.course_slug || req.body.courseSlug;
      const transaction_ref = req.body.transaction_ref || req.body.transactionRef;
      const student_notes = req.body.student_notes || req.body.studentNotes || '';
      const payment_confirmed = req.body.payment_confirmed !== undefined
        ? req.body.payment_confirmed
        : (req.body.confirmedPayment !== undefined ? req.body.confirmedPayment : req.body.paymentConfirmed);

      // 1. Confirm payment checkbox
      if (payment_confirmed !== true && payment_confirmed !== 'true') {
        return res.status(400).json({
          success: false,
          error: 'You must confirm that you have completed the UPI payment before submitting.',
        });
      }

      // 2. Validate payment configuration is active
      const configRes = await client.query('SELECT * FROM payment_settings WHERE id = 1 LIMIT 1');
      const config = configRes.rows[0];
      if (!config || !config.is_manual_enabled) {
        return res.status(400).json({
          success: false,
          error: 'Manual UPI payments are currently disabled. Please contact admissions.',
        });
      }
      if (!config.qr_code_url || !config.recipient_name) {
        return res.status(400).json({
          success: false,
          error: 'Official payment QR code details have not been finalized by the administrator.',
        });
      }

      // 3. Resolve authoritative course and verified price from DB
      let targetCourse = null;
      if (course_id) {
        const cRes = await client.query('SELECT * FROM courses WHERE id = $1 LIMIT 1', [course_id]);
        if (cRes.rows.length > 0) targetCourse = cRes.rows[0];
      }
      if (!targetCourse && course_slug) {
        const cRes = await client.query('SELECT * FROM courses WHERE slug = $1 LIMIT 1', [course_slug]);
        if (cRes.rows.length > 0) targetCourse = cRes.rows[0];
      }

      if (!targetCourse) {
        return res.status(404).json({ success: false, error: 'Course not found.' });
      }

      const authoritativePrice = parseFloat(targetCourse.price) || 0;
      if (authoritativePrice <= 0) {
        return res.status(400).json({
          success: false,
          error: 'This course does not require payment or is an enquiry-only course.',
        });
      }

      // 4. Validate Student doesn't already have confirmed enrollment
      const existingEnrollment = await client.query(
        `SELECT id FROM enrollments
         WHERE (user_id = $1 OR LOWER(email) = $2)
           AND course_id = $3
           AND enrollment_status = 'enrolled'
           AND (payment_status = 'completed' OR payment_status = 'paid' OR amount_paid > 0)
         LIMIT 1`,
        [userId, userEmail, targetCourse.id]
      );

      if (existingEnrollment.rows.length > 0) {
        return res.status(409).json({
          success: false,
          isAlreadyEnrolled: true,
          error: 'You are already enrolled in this course with active access.',
        });
      }

      // 5. Check if user already has an active PENDING or UNDER_REVIEW claim for this course
      const activeClaimCheck = await client.query(
        `SELECT id, claim_id, status, created_at
         FROM manual_payment_claims
         WHERE user_id = $1 AND course_id = $2 AND status IN ('PENDING', 'UNDER_REVIEW')
         LIMIT 1`,
        [userId, targetCourse.id]
      );

      if (activeClaimCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          hasActiveClaim: true,
          claimId: activeClaimCheck.rows[0].claim_id,
          status: activeClaimCheck.rows[0].status,
          error: `You already have a payment claim (${activeClaimCheck.rows[0].claim_id}) awaiting admin verification for this course.`,
        });
      }

      // 6. Validate UTR / Transaction Reference
      const utrValidation = normalizeAndValidateUtr(transaction_ref);
      if (!utrValidation.valid) {
        return res.status(400).json({ success: false, error: utrValidation.error });
      }
      const normalizedUtr = utrValidation.normalized;

      // 7. Check uniqueness of UTR across active claims
      const duplicateUtrCheck = await client.query(
        `SELECT id, claim_id, status
         FROM manual_payment_claims
         WHERE UPPER(transaction_ref) = $1 AND status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED')
         LIMIT 1`,
        [normalizedUtr]
      );

      if (duplicateUtrCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'This UPI transaction reference / UTR number has already been submitted and is currently in review or approved.',
        });
      }

      // Check historical payments & enrollments for duplicate reference
      const legacyPaymentCheck = await client.query(
        `SELECT id FROM payments
         WHERE UPPER(payment_id) = $1 OR UPPER(order_id) = $1
         LIMIT 1`,
        [normalizedUtr]
      );
      if (legacyPaymentCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'This transaction reference is already linked to a past payment record.',
        });
      }

      // 8. Validate and Save Uploaded Payment Screenshot
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          error: 'A screenshot of your completed UPI payment is required.',
        });
      }

      let savedScreenshot;
      try {
        savedScreenshot = await savePrivateScreenshot({
          buffer: req.file.buffer,
          originalName: req.file.originalname,
        });
      } catch (uploadErr) {
        return res.status(400).json({
          success: false,
          error: uploadErr.message || 'Payment screenshot failed validation.',
        });
      }

      // 9. Generate unique Claim ID
      const claimId = `MPC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // 10. Insert Payment Claim into PostgreSQL
      const insertRes = await client.query(
        `INSERT INTO manual_payment_claims (
          claim_id, user_id, course_id, amount, currency, transaction_ref,
          screenshot_path, screenshot_original_name, screenshot_mime_type,
          screenshot_size_bytes, status, student_notes
        ) VALUES ($1, $2, $3, $4, 'INR', $5, $6, $7, $8, $9, 'PENDING', $10)
        RETURNING *`,
        [
          claimId,
          userId,
          targetCourse.id,
          authoritativePrice,
          normalizedUtr,
          savedScreenshot.storagePath,
          savedScreenshot.originalName,
          savedScreenshot.mimeType,
          savedScreenshot.sizeBytes,
          student_notes ? String(student_notes).slice(0, 500) : null,
        ]
      );

      const claim = insertRes.rows[0];

      return res.status(201).json({
        success: true,
        message: 'Your payment proof has been submitted successfully. Your enrollment is pending admin verification.',
        claim: {
          id: claim.id,
          claim_id: claim.claim_id,
          course_id: targetCourse.id,
          course_title: targetCourse.title,
          amount: authoritativePrice,
          currency: 'INR',
          transaction_ref: normalizedUtr,
          status: claim.status,
          created_at: claim.created_at,
        },
      });
    } catch (err) {
      console.error('[Manual Payment Claim Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit payment claim. Please try again or contact admissions.',
      });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/student/payment-claims
 * Returns all payment claims submitted by the authenticated student (IDOR protected).
 */
manualPaymentsRouter.get('/student-claims', authMiddleware, async (req, res) => {
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

    // Format claims with display masks and next actions
    const claims = result.rows.map((row) => {
      const rawRef = row.transaction_ref || '';
      const maskedRef =
        rawRef.length > 4 ? `••••••••${rawRef.slice(-4)}` : rawRef;

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
 * GET /api/student/payment-claims/:claimId/screenshot
 * Securely streams the submitted screenshot for an authenticated student's own claim (IDOR protected).
 */
manualPaymentsRouter.get('/student-claims/:claimId/screenshot', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { claimId } = req.params;

    const claimRes = await pool.query(
      `SELECT screenshot_path, screenshot_mime_type, user_id
       FROM manual_payment_claims
       WHERE (claim_id = $1 OR id::text = $1)
       LIMIT 1`,
      [claimId]
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
    if (!filePath) {
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
 * POST /api/payments/manual-claim/:claimId/resubmit
 * Allows a student to resubmit an explicit, rejected claim with corrected reference and new screenshot.
 */
manualPaymentsRouter.post(
  '/manual-claim/:claimId/resubmit',
  authMiddleware,
  (req, res, next) => {
    upload.single('screenshot')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'Screenshot file size exceeds 10MB limit.',
          });
        }
        return res.status(400).json({ success: false, error: err.message });
      } else if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.user.id;
      const { claimId } = req.params;
      const { transaction_ref, student_notes } = req.body;

      const claimRes = await client.query(
        `SELECT * FROM manual_payment_claims
         WHERE (claim_id = $1 OR id::text = $1) AND user_id = $2
         LIMIT 1`,
        [claimId, userId]
      );

      if (claimRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Claim not found or unauthorized.' });
      }

      const existingClaim = claimRes.rows[0];

      if (existingClaim.status !== 'REJECTED') {
        return res.status(400).json({
          success: false,
          error: 'Only rejected payment claims may be resubmitted. This claim is currently ' + existingClaim.status,
        });
      }

      // Validate new UTR
      const utrVal = normalizeAndValidateUtr(transaction_ref);
      if (!utrVal.valid) {
        return res.status(400).json({ success: false, error: utrVal.error });
      }
      const normalizedUtr = utrVal.normalized;

      // Check duplicate UTR against other claims
      const dupCheck = await client.query(
        `SELECT id FROM manual_payment_claims
         WHERE UPPER(transaction_ref) = $1 AND id != $2 AND status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED')
         LIMIT 1`,
        [normalizedUtr, existingClaim.id]
      );

      if (dupCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'This transaction reference is already in use by another active claim.',
        });
      }

      // If new screenshot provided, save it
      let newScreenshotPath = existingClaim.screenshot_path;
      let newMime = existingClaim.screenshot_mime_type;
      let newSize = existingClaim.screenshot_size_bytes;
      let newOriginal = existingClaim.screenshot_original_name;

      if (req.file && req.file.buffer) {
        const saved = await savePrivateScreenshot({
          buffer: req.file.buffer,
          originalName: req.file.originalname,
        });
        newScreenshotPath = saved.storagePath;
        newMime = saved.mimeType;
        newSize = saved.sizeBytes;
        newOriginal = saved.originalName;
      }

      // Update claim to PENDING
      const updateRes = await client.query(
        `UPDATE manual_payment_claims
         SET transaction_ref = $1,
             screenshot_path = $2,
             screenshot_original_name = $3,
             screenshot_mime_type = $4,
             screenshot_size_bytes = $5,
             status = 'PENDING',
             rejection_reason = NULL,
             admin_notes = COALESCE(admin_notes, '') || E'\n[Resubmitted on ' || CURRENT_TIMESTAMP || ' by student]',
             student_notes = $6,
             reviewed_by = NULL,
             reviewed_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [
          normalizedUtr,
          newScreenshotPath,
          newOriginal,
          newMime,
          newSize,
          student_notes || existingClaim.student_notes,
          existingClaim.id,
        ]
      );

      return res.status(200).json({
        success: true,
        message: 'Payment claim resubmitted successfully. It is now pending review.',
        claim: updateRes.rows[0],
      });
    } catch (err) {
      console.error('[Claim Resubmit Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to resubmit payment claim.' });
    } finally {
      client.release();
    }
  }
);
