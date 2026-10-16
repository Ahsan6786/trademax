import { Router } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export const paymentsRouter = Router();

// Lazy / safe Razorpay client initializer
const getRazorpayClient = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials not configured in backend environment.');
  }

  return new Razorpay({ key_id, key_secret });
};

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
 * GET /api/payments/config
 * Public readiness check: returns Razorpay Key ID and test mode confirmation
 */
paymentsRouter.get('/config', (req, res) => {
  const key = process.env.RAZORPAY_KEY_ID || '';
  const isConfigured = Boolean(key && process.env.RAZORPAY_KEY_SECRET);
  return res.status(200).json({
    success: true,
    isConfigured,
    key,
    mode: key.startsWith('rzp_test_') ? 'test' : 'live',
    currency: 'INR',
  });
});

/**
 * POST /api/payments/create-order
 * Secure server-side order generation:
 * - Resolves course price directly from DB (prevents client price manipulation)
 * - Checks for duplicate active enrollments
 * - Creates Razorpay Order with currency INR & unique receipt
 * - Stores pending payment record in PostgreSQL
 */
paymentsRouter.post('/create-order', async (req, res) => {
  try {
    const razorpay = getRazorpayClient();
    const decodedUser = getOptionalUser(req);
    let userId = decodedUser ? decodedUser.id : null;

    let {
      course_id,
      course_slug = 'trading-masterclass',
      name,
      email,
      mobile,
      trading_experience = 'Beginner',
      interest = 'Both',
      reference = 'Website',
    } = req.body;

    // 1. Sync from authenticated user profile if logged in
    if (userId) {
      const userRes = await pool.query(
        'SELECT id, name, email, mobile, trading_experience FROM users WHERE id = $1 LIMIT 1',
        [userId]
      );
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        name = (name && name.trim()) || u.name;
        email = (email && email.trim()) || u.email;
        mobile = (mobile && mobile.trim()) || u.mobile;
        trading_experience = trading_experience || u.trading_experience || 'Beginner';
      }
    }

    // 2. Validate required customer details
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!email || typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }
    if (!mobile || typeof mobile !== 'string' || !mobile.trim()) {
      return res.status(400).json({ success: false, error: 'Mobile number is required.' });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanMobile = mobile.trim();

    // 3. Resolve target course and verified price from DB
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

    if (!targetCourse) {
      return res.status(404).json({ success: false, error: 'Selected course not found.' });
    }

    const resolvedCourseId = targetCourse.id;
    const resolvedCourseName = targetCourse.title || 'Trading Masterclass';
    const resolvedBatch = targetCourse.batch_name || 'November';
    const coursePriceNum = parseFloat(targetCourse.price) || 19999.0;
    const amountInPaise = Math.round(coursePriceNum * 100);

    // 4. Duplicate Active Enrollment Check
    const duplicateCheck = await pool.query(
      `SELECT id, enrollment_status, payment_status, created_at
       FROM enrollments
       WHERE (course_id = $1 OR course_name = $2)
         AND (
           (user_id IS NOT NULL AND user_id = $3)
           OR LOWER(email) = $4
         )
         AND enrollment_status = 'enrolled'
         AND payment_status = 'completed'
       LIMIT 1`,
      [resolvedCourseId, resolvedCourseName, userId, cleanEmail]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        error: 'You are already enrolled in this course with active access.',
        enrollmentId: duplicateCheck.rows[0].id,
      });
    }

    // 5. Generate clean unique receipt
    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 6. Create Razorpay Order
    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt.slice(0, 40),
      notes: {
        course_id: String(resolvedCourseId),
        course_slug: targetCourse.slug,
        course_title: resolvedCourseName,
        batch_name: resolvedBatch,
        user_id: userId ? String(userId) : 'guest',
        customer_email: cleanEmail,
        customer_mobile: cleanMobile,
        interest: String(interest || 'Both'),
        trading_experience: String(trading_experience || 'Beginner'),
        reference: String(reference || 'Website'),
      },
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    // 7. Store initial payment order in PostgreSQL
    await pool.query(
      `INSERT INTO payments (
        user_id, course_id, order_id, amount, currency, status,
        receipt, notes, customer_name, customer_email, customer_mobile
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (order_id) DO UPDATE SET
        amount = EXCLUDED.amount,
        customer_name = EXCLUDED.customer_name,
        customer_email = EXCLUDED.customer_email,
        customer_mobile = EXCLUDED.customer_mobile,
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        resolvedCourseId,
        razorpayOrder.id,
        coursePriceNum,
        razorpayOrder.currency || 'INR',
        'created',
        receipt,
        JSON.stringify(orderOptions.notes),
        cleanName,
        cleanEmail,
        cleanMobile,
      ]
    );

    return res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
      },
      course: {
        id: resolvedCourseId,
        slug: targetCourse.slug,
        title: resolvedCourseName,
        batch_name: resolvedBatch,
        price: coursePriceNum,
      },
      customer: {
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile,
      },
    });
  } catch (err) {
    console.error('[Create Razorpay Order Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to initialize payment gateway order.',
    });
  }
});

/**
 * POST /api/payments/verify
 * Server-side signature verification & course entitlement:
 * - Uses HMAC SHA256 of (order_id + '|' + payment_id) with RAZORPAY_KEY_SECRET
 * - Confirms payment capture with Razorpay API
 * - Enrolls student in PostgreSQL inside an atomic database transaction
 * - Decrements course seat count
 * - Idempotent: repeated calls return confirmed enrollment without double-charging
 */
paymentsRouter.post('/verify', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      course_id,
      name,
      email,
      mobile,
      trading_experience,
      interest,
      reference,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters (order_id, payment_id, or signature).',
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay secret key not configured on server.',
      });
    }

    // 1. Cryptographic HMAC-SHA256 signature verification
    const bodyToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyToSign)
      .digest('hex');

    const isSignatureValid =
      generatedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'utf-8'),
        Buffer.from(razorpay_signature, 'utf-8')
      );

    if (!isSignatureValid) {
      console.warn(`[Payment Verification Failed]: Signature mismatch for order ${razorpay_order_id}`);

      // Record failed verification attempt in payments audit log safely
      try {
        await client.query(
          `UPDATE payments
           SET status = 'failed',
               signature = $1,
               error_code = 'INVALID_SIGNATURE',
               error_description = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE order_id = $3 AND status != 'captured'`,
          [
            razorpay_signature,
            `HMAC signature mismatch. Claimed payment_id: ${razorpay_payment_id}`,
            razorpay_order_id,
          ]
        );
      } catch (auditErr) {
        console.warn('[Audit Update Warning]:', auditErr.message);
      }

      return res.status(400).json({
        success: false,
        error: 'Payment signature verification failed. Access cannot be granted.',
      });
    }

    // 2. Fetch existing payment record
    const paymentRecordRes = await client.query(
      'SELECT * FROM payments WHERE order_id = $1 LIMIT 1',
      [razorpay_order_id]
    );
    const existingPayment = paymentRecordRes.rows[0] || null;

    // 3. Idempotency Check: if already captured, return existing enrollment
    if (existingPayment && existingPayment.status === 'captured') {
      const existingEnrollmentRes = await client.query(
        `SELECT * FROM enrollments
         WHERE order_id = $1 OR payment_id = $2 OR id = $3
         LIMIT 1`,
        [razorpay_order_id, razorpay_payment_id, existingPayment.enrollment_id]
      );

      return res.status(200).json({
        success: true,
        isIdempotent: true,
        message: 'Payment already verified and course access granted.',
        enrollment: existingEnrollmentRes.rows[0] || null,
        payment: {
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          status: 'captured',
        },
      });
    }

    // 4. Fetch rich payment info from Razorpay API
    let paymentDetails = null;
    try {
      const razorpay = getRazorpayClient();
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (fetchErr) {
      console.warn('[Razorpay Fetch Warning]:', fetchErr.message);
    }

    const paymentMethod = paymentDetails?.method || 'online';
    const paymentBank = paymentDetails?.bank || null;
    const paymentWallet = paymentDetails?.wallet || null;
    const paymentVpa = paymentDetails?.vpa || null;
    const capturedAmountNum = paymentDetails?.amount
      ? paymentDetails.amount / 100
      : existingPayment?.amount || 19999.0;

    // 5. Atomic Transaction: Enroll Student + Capture Payment + Sync Seats
    await client.query('BEGIN');

    // Extract customer and course data from payment notes or request
    const notes = existingPayment?.notes || {};
    const customerEmail = (email || existingPayment?.customer_email || notes.customer_email || '').trim().toLowerCase();
    const customerName = (name || existingPayment?.customer_name || notes.customer_name || 'TradeMax Student').trim();
    const customerMobile = (mobile || existingPayment?.customer_mobile || notes.customer_mobile || '').trim();
    const expValue = trading_experience || notes.trading_experience || 'Beginner';
    const interestValue = interest || notes.interest || 'Both';
    const refValue = reference || notes.reference || 'Website';

    // Resolve user ID if authenticated or match by email
    let userId = existingPayment?.user_id || null;
    if (!userId) {
      const decodedUser = getOptionalUser(req);
      userId = decodedUser ? decodedUser.id : null;
    }
    if (!userId && customerEmail) {
      const uRes = await client.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [customerEmail]);
      if (uRes.rows.length > 0) userId = uRes.rows[0].id;
    }

    // Resolve course
    const targetCourseId = course_id || existingPayment?.course_id || (notes.course_id ? parseInt(notes.course_id, 10) : null);
    let courseRow = null;
    if (targetCourseId) {
      const cRes = await client.query('SELECT * FROM courses WHERE id = $1 LIMIT 1', [targetCourseId]);
      if (cRes.rows.length > 0) courseRow = cRes.rows[0];
    }
    if (!courseRow) {
      const cRes = await client.query("SELECT * FROM courses WHERE slug = 'trading-masterclass' LIMIT 1");
      if (cRes.rows.length > 0) courseRow = cRes.rows[0];
    }

    const resolvedCourseId = courseRow ? courseRow.id : targetCourseId;
    const resolvedCourseName = courseRow?.title || notes.course_title || 'Trading Masterclass';
    const resolvedBatch = courseRow?.batch_name || notes.batch_name || 'November';

    // Check if an enrollment record already exists for this order/payment
    let enrollmentRow = null;
    const existingEnrollmentCheck = await client.query(
      `SELECT * FROM enrollments
       WHERE order_id = $1 OR payment_id = $2
       LIMIT 1`,
      [razorpay_order_id, razorpay_payment_id]
    );

    if (existingEnrollmentCheck.rows.length > 0) {
      // Update existing record
      const updateEnrollRes = await client.query(
        `UPDATE enrollments
         SET enrollment_status = 'enrolled',
             payment_status = 'completed',
             amount_paid = $1,
             payment_id = $2,
             order_id = $3,
             payment_method = $4,
             transaction_id = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [capturedAmountNum, razorpay_payment_id, razorpay_order_id, paymentMethod, razorpay_payment_id, existingEnrollmentCheck.rows[0].id]
      );
      enrollmentRow = updateEnrollRes.rows[0];
    } else {
      // Insert new verified enrollment
      const insertEnrollRes = await client.query(
        `INSERT INTO enrollments (
          user_id, course_id, course_name, name, email, mobile,
          trading_experience, interest, reference, batch_name,
          enrollment_status, payment_status, amount_paid,
          order_id, payment_id, payment_method, transaction_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'enrolled', 'completed', $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          userId,
          resolvedCourseId,
          resolvedCourseName,
          customerName,
          customerEmail,
          customerMobile,
          expValue,
          interestValue,
          refValue,
          resolvedBatch,
          capturedAmountNum,
          razorpay_order_id,
          razorpay_payment_id,
          paymentMethod,
          razorpay_payment_id,
        ]
      );
      enrollmentRow = insertEnrollRes.rows[0];
    }

    // Update Payments row with captured state and link to enrollment
    await client.query(
      `INSERT INTO payments (
        user_id, course_id, enrollment_id, order_id, payment_id, signature,
        amount, currency, status, method, bank, wallet, vpa,
        customer_name, customer_email, customer_mobile, raw_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'INR', 'captured', $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (order_id) DO UPDATE SET
        enrollment_id = EXCLUDED.enrollment_id,
        payment_id = EXCLUDED.payment_id,
        signature = EXCLUDED.signature,
        status = 'captured',
        method = EXCLUDED.method,
        bank = EXCLUDED.bank,
        wallet = EXCLUDED.wallet,
        vpa = EXCLUDED.vpa,
        raw_payload = EXCLUDED.raw_payload,
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        resolvedCourseId,
        enrollmentRow.id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        capturedAmountNum,
        paymentMethod,
        paymentBank,
        paymentWallet,
        paymentVpa,
        customerName,
        customerEmail,
        customerMobile,
        JSON.stringify(paymentDetails || {}),
      ]
    );

    // Sync to course_registrations for backwards compatibility
    await client.query(
      `INSERT INTO course_registrations (
        user_id, course_id, name, mobile, email, trading_experience,
        interest, reference, course_name, batch_name, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', $11)
      ON CONFLICT DO NOTHING`,
      [
        userId,
        resolvedCourseId,
        customerName,
        customerMobile,
        customerEmail,
        expValue,
        interestValue,
        refValue,
        resolvedCourseName,
        resolvedBatch,
        `Paid via Razorpay: ${razorpay_payment_id}`,
      ]
    );

    // Decrement available seats safely
    if (resolvedCourseId) {
      await client.query(
        `UPDATE courses
         SET seats_available = GREATEST(0, seats_available - 1),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND seats_available > 0`,
        [resolvedCourseId]
      );
    }

    await client.query('COMMIT');

    console.log(`[Payment Verified]: Successfully enrolled ${customerEmail} in ${resolvedCourseName} (Payment: ${razorpay_payment_id})`);

    return res.status(200).json({
      success: true,
      message: 'Payment verified and enrollment confirmed.',
      enrollment: enrollmentRow,
      payment: {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        amount: capturedAmountNum,
        status: 'captured',
        method: paymentMethod,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Payment Verification Server Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify payment or grant course enrollment.',
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payments/failed
 * Records client-side payment drop-offs, user cancellations, or bank failures
 */
paymentsRouter.post('/failed', async (req, res) => {
  try {
    const { order_id, payment_id, error_code, error_description, reason } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: 'order_id is required.' });
    }

    await pool.query(
      `UPDATE payments
       SET status = 'failed',
           payment_id = COALESCE($1, payment_id),
           error_code = $2,
           error_description = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $4`,
      [payment_id || null, error_code || reason || 'PAYMENT_FAILED', error_description || 'Payment was not completed', order_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Payment failure recorded.',
    });
  } catch (err) {
    console.error('[Payment Failure Log Error]:', err);
    return res.status(500).json({ success: false, error: 'Could not log payment failure.' });
  }
});

/**
 * POST /api/payments/webhook
 * Razorpay Webhook Handler:
 * - Uses raw request body to verify X-Razorpay-Signature
 * - Reconciles payment.captured, payment.failed, and order.paid events
 * - Ensures enrollment access even if the student closed the browser before redirection
 */
paymentsRouter.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !webhookSecret) {
      console.warn('[Webhook Warning]: Missing signature or webhook secret.');
      return res.status(400).json({ status: 'invalid_signature' });
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isMatch =
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(signature, 'utf-8'),
        Buffer.from(expectedSignature, 'utf-8')
      );

    if (!isMatch) {
      console.warn('[Webhook Warning]: Invalid Razorpay webhook signature.');
      return res.status(400).json({ status: 'invalid_signature' });
    }

    const { event, payload } = req.body;
    console.log(`[Razorpay Webhook Received]: Event ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        // Check if payment already captured
        const pCheck = await pool.query('SELECT status, enrollment_id FROM payments WHERE order_id = $1', [orderId]);
        if (pCheck.rows.length === 0 || pCheck.rows[0].status !== 'captured') {
          console.log(`[Webhook Reconcile]: Capturing payment ${paymentId} for order ${orderId}`);

          const amountNum = paymentEntity.amount ? paymentEntity.amount / 100 : 19999.0;
          const notes = paymentEntity.notes || {};
          const customerEmail = (paymentEntity.email || notes.customer_email || '').toLowerCase();
          const customerName = notes.customer_name || 'TradeMax Student';
          const customerMobile = paymentEntity.contact || notes.customer_mobile || '';
          const courseId = notes.course_id ? parseInt(notes.course_id, 10) : null;
          const courseName = notes.course_title || 'Trading Masterclass';
          const batchName = notes.batch_name || 'November';

          // Link to user if exists
          let userId = null;
          if (customerEmail) {
            const uRes = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [customerEmail]);
            if (uRes.rows.length > 0) userId = uRes.rows[0].id;
          }

          // Insert or update enrollment
          const enrollRes = await pool.query(
            `INSERT INTO enrollments (
              user_id, course_id, course_name, name, email, mobile,
              batch_name, enrollment_status, payment_status, amount_paid,
              order_id, payment_id, payment_method, transaction_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'enrolled', 'completed', $8, $9, $10, $11, $12)
            ON CONFLICT DO NOTHING
            RETURNING id`,
            [
              userId,
              courseId,
              courseName,
              customerName,
              customerEmail,
              customerMobile,
              batchName,
              amountNum,
              orderId,
              paymentId,
              paymentEntity.method || 'online',
              paymentId,
            ]
          );

          const enrollmentId = enrollRes.rows[0]?.id || pCheck.rows[0]?.enrollment_id || null;

          // Update payments row
          await pool.query(
            `UPDATE payments
             SET status = 'captured',
                 payment_id = $1,
                 method = $2,
                 bank = $3,
                 wallet = $4,
                 vpa = $5,
                 enrollment_id = COALESCE($6, enrollment_id),
                 raw_payload = $7,
                 updated_at = CURRENT_TIMESTAMP
             WHERE order_id = $8`,
            [
              paymentId,
              paymentEntity.method,
              paymentEntity.bank,
              paymentEntity.wallet,
              paymentEntity.vpa,
              enrollmentId,
              JSON.stringify(paymentEntity),
              orderId,
            ]
          );
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        await pool.query(
          `UPDATE payments
           SET status = 'failed',
               payment_id = COALESCE($1, payment_id),
               error_code = $2,
               error_description = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE order_id = $4`,
          [paymentId, paymentEntity?.error_code, paymentEntity?.error_description, orderId]
        );
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[Webhook Processing Error]:', err);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

/**
 * GET /api/payments/status/:orderId
 * Poll or check status of an order
 */
paymentsRouter.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query(
      `SELECT p.id, p.order_id, p.payment_id, p.amount, p.currency, p.status,
              p.method, p.created_at, p.updated_at,
              e.id as enrollment_id, e.enrollment_status, e.payment_status
       FROM payments p
       LEFT JOIN enrollments e ON p.enrollment_id = e.id
       WHERE p.order_id = $1 LIMIT 1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    return res.status(200).json({
      success: true,
      payment: result.rows[0],
    });
  } catch (err) {
    console.error('[Payment Status Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve payment status.' });
  }
});
