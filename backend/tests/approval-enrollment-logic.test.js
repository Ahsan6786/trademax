import assert from 'node:assert/strict';
import test, { describe, before, after } from 'node:test';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';

const BASE_URL = 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';

const createToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

// Valid JPEG magic bytes for testing
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0xff, 0xd9,
]);

function createMultipartFormData(fields, fileField) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const crlf = '\r\n';
  let bodyBuffers = [];

  for (const [key, value] of Object.entries(fields)) {
    bodyBuffers.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`
      )
    );
  }

  if (fileField) {
    bodyBuffers.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"${crlf}Content-Type: ${fileField.contentType}${crlf}${crlf}`
      )
    );
    bodyBuffers.push(fileField.buffer);
    bodyBuffers.push(Buffer.from(crlf));
  }

  bodyBuffers.push(Buffer.from(`--${boundary}--${crlf}`));
  const body = Buffer.concat(bodyBuffers);

  return {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length.toString(),
    },
    body,
  };
}

describe('TRADEMAX Manual Payment Approval and Enrollment Workflow (Scenarios A through J)', () => {
  let studentA;
  let studentB;
  let adminUser;
  let studentAToken;
  let studentBToken;
  let adminToken;
  let targetCourse;
  let submittedClaimA;
  let submittedClaimB;

  before(async () => {
    // 1. Target Course
    const cRes = await pool.query('SELECT * FROM courses ORDER BY id ASC LIMIT 1');
    targetCourse = cRes.rows[0];

    // 2. Admin User
    const aRes = await pool.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    adminUser = aRes.rows[0];
    adminToken = createToken({ id: adminUser.id, email: adminUser.email, role: 'admin' });

    // 3. Clean up test users
    await pool.query("DELETE FROM users WHERE email IN ('test_flow_student_a@trademax.in', 'test_flow_student_b@trademax.in')");

    // 4. Create Student A
    const saRes = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ('Student Flow A', 'test_flow_student_a@trademax.in', 'hash', 'student') RETURNING *"
    );
    studentA = saRes.rows[0];
    studentAToken = createToken(studentA);

    // 5. Create Student B
    const sbRes = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ('Student Flow B', 'test_flow_student_b@trademax.in', 'hash', 'student') RETURNING *"
    );
    studentB = sbRes.rows[0];
    studentBToken = createToken(studentB);
  });

  after(async () => {
    // Clean up created test data
    if (studentA && studentB) {
      await pool.query('DELETE FROM payments WHERE user_id IN ($1, $2)', [studentA.id, studentB.id]);
      await pool.query('DELETE FROM enrollments WHERE user_id IN ($1, $2)', [studentA.id, studentB.id]);
      await pool.query('DELETE FROM manual_payment_claims WHERE user_id IN ($1, $2)', [studentA.id, studentB.id]);
      await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [studentA.id, studentB.id]);
    }
  });

  // Scenario A: Student submits QR payment proof
  test('A. Student submits QR payment proof: status PENDING; no active enrollment; course content inaccessible', async () => {
    const utr = 'UTRFLOWA' + Date.now();
    const multipart = createMultipartFormData(
      {
        courseId: targetCourse.id.toString(),
        transactionRef: utr,
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proofA.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const res = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: { ...multipart.headers, Authorization: `Bearer ${studentAToken}` },
      body: multipart.body,
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.claim.status, 'PENDING');
    assert.equal(
      data.message,
      'Your payment proof has been submitted successfully. Your enrollment is pending admin verification.'
    );
    submittedClaimA = data.claim;

    // Verify in database: NO active enrollment exists
    const enrollRes = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [studentA.id, targetCourse.id]
    );
    assert.equal(enrollRes.rows.length, 0);

    // Verify course content is inaccessible (403)
    const classroomRes = await fetch(`${BASE_URL}/api/student/courses/${targetCourse.id}/classroom`, {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });
    const classroomData = await classroomRes.json();
    assert.equal(classroomRes.status, 403);
    assert.equal(classroomData.success, false);
    assert.equal(classroomData.isPending, true);
  });

  // Scenario B: Student opens My Courses
  test('B. Student opens My Courses: Course shows IN PROCESS and the payment-pending note', async () => {
    const res = await fetch(`${BASE_URL}/api/student/my-courses`, {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert(Array.isArray(data.courses));

    const courseItem = data.courses.find((c) => c.course_id === targetCourse.id);
    assert(courseItem, 'Course should appear in My Courses');
    assert.equal(courseItem.status, 'IN PROCESS');
    assert.equal(courseItem.is_in_process, true);
    assert.equal(courseItem.access_granted, false);
    assert.equal(
      courseItem.process_note,
      'Your payment is in process. Your course access will be activated after admin verification.'
    );
    assert.equal(courseItem.claim_id, submittedClaimA.claim_id);
  });

  // Scenario C: Admin approves the payment
  test('C. Admin approves the payment: Claim becomes APPROVED; enrollment activates; My Courses shows ENROLLED', async () => {
    const approveRes = await fetch(
      `${BASE_URL}/api/admin/payment-claims/${submittedClaimA.claim_id}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ admin_notes: 'Bank reference verified' }),
      }
    );

    const approveData = await approveRes.json();
    assert.equal(approveRes.status, 200);
    assert.equal(approveData.success, true);
    assert.equal(approveData.claim.status, 'APPROVED');

    // Verify enrollment activated in database
    const enrollRes = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [studentA.id, targetCourse.id]
    );
    assert.equal(enrollRes.rows.length, 1);
    assert.equal(enrollRes.rows[0].enrollment_status, 'enrolled');
    assert.equal(enrollRes.rows[0].payment_status, 'completed');

    // Verify My Courses now shows ENROLLED with access_granted: true
    const myCoursesRes = await fetch(`${BASE_URL}/api/student/my-courses`, {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });
    const myCoursesData = await myCoursesRes.json();
    const enrolledItem = myCoursesData.courses.find((c) => c.course_id === targetCourse.id);
    assert.equal(enrolledItem.status, 'ENROLLED');
    assert.equal(enrolledItem.is_in_process, false);
    assert.equal(enrolledItem.access_granted, true);
  });

  // Scenario D: Admin rejects the payment
  test('D. Admin rejects the payment: Claim becomes REJECTED; no enrollment is activated', async () => {
    // Student B submits a payment proof
    const utrB = 'UTRFLOWB' + Date.now();
    const multipart = createMultipartFormData(
      {
        courseId: targetCourse.id.toString(),
        transactionRef: utrB,
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proofB.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const submitRes = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: { ...multipart.headers, Authorization: `Bearer ${studentBToken}` },
      body: multipart.body,
    });
    const submitData = await submitRes.json();
    assert.equal(submitRes.status, 201);
    submittedClaimB = submitData.claim;

    // Admin rejects Claim B
    const rejectRes = await fetch(
      `${BASE_URL}/api/admin/payment-claims/${submittedClaimB.claim_id}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          rejection_reason: 'UTR reference not found in ICICI bank statement.',
        }),
      }
    );

    const rejectData = await rejectRes.json();
    assert.equal(rejectRes.status, 200);
    assert.equal(rejectData.success, true);
    assert.equal(rejectData.claim.status, 'REJECTED');

    // Confirm no enrollment was created
    const enrollRes = await pool.query(
      'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [studentB.id, targetCourse.id]
    );
    assert.equal(enrollRes.rows.length, 0);

    // Verify My Courses reflects PAYMENT REJECTED
    const myCoursesRes = await fetch(`${BASE_URL}/api/student/my-courses`, {
      headers: { Authorization: `Bearer ${studentBToken}` },
    });
    const myCoursesData = await myCoursesRes.json();
    const rejItem = myCoursesData.courses.find((c) => c.course_id === targetCourse.id);
    assert(rejItem);
    assert.equal(rejItem.status, 'PAYMENT REJECTED');
    assert.equal(rejItem.is_rejected, true);
    assert.equal(rejItem.access_granted, false);
    assert.match(rejItem.rejection_reason, /bank statement/i);
  });

  // Scenario E: Student tries to access course content while payment is pending
  test('E. Student tries to access course content while payment is pending: Backend denies access (403)', async () => {
    // Create temporary student C with pending claim
    const scRes = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ('Student Pending', 'temp_pending@trademax.in', 'hash', 'student') RETURNING *"
    );
    const studentC = scRes.rows[0];
    const studentCToken = createToken(studentC);

    const utrC = 'UTRPENDING' + Date.now();
    const multipart = createMultipartFormData(
      {
        courseId: targetCourse.id.toString(),
        transactionRef: utrC,
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proofC.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: { ...multipart.headers, Authorization: `Bearer ${studentCToken}` },
      body: multipart.body,
    });

    // Try to access classroom
    const classroomRes = await fetch(`${BASE_URL}/api/student/courses/${targetCourse.id}/classroom`, {
      headers: { Authorization: `Bearer ${studentCToken}` },
    });
    assert.equal(classroomRes.status, 403);
    const classroomData = await classroomRes.json();
    assert.equal(classroomData.success, false);
    assert.equal(classroomData.isPending, true);

    // Clean up temporary student C
    await pool.query('DELETE FROM manual_payment_claims WHERE user_id = $1', [studentC.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [studentC.id]);
  });

  // Scenario F: Student attempts duplicate payment submissions
  test('F. Student attempts duplicate payment submissions: Duplicate pending claims are prevented appropriately (409)', async () => {
    // Create temporary student D
    const sdRes = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ('Student Dup', 'temp_dup@trademax.in', 'hash', 'student') RETURNING *"
    );
    const studentD = sdRes.rows[0];
    const studentDToken = createToken(studentD);

    const utrD1 = 'UTRDUP1' + Date.now();
    const multipart1 = createMultipartFormData(
      {
        courseId: targetCourse.id.toString(),
        transactionRef: utrD1,
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proofD1.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const firstRes = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: { ...multipart1.headers, Authorization: `Bearer ${studentDToken}` },
      body: multipart1.body,
    });
    assert.equal(firstRes.status, 201);

    // Attempt second claim for same course while first is pending
    const utrD2 = 'UTRDUP2' + Date.now();
    const multipart2 = createMultipartFormData(
      {
        courseId: targetCourse.id.toString(),
        transactionRef: utrD2,
        payment_confirmed: 'true',
      },
      {
        name: 'screenshot',
        filename: 'proofD2.jpg',
        contentType: 'image/jpeg',
        buffer: VALID_JPEG_BUFFER,
      }
    );

    const dupRes = await fetch(`${BASE_URL}/api/payments/manual-claim`, {
      method: 'POST',
      headers: { ...multipart2.headers, Authorization: `Bearer ${studentDToken}` },
      body: multipart2.body,
    });
    const dupData = await dupRes.json();
    assert.equal(dupRes.status, 409);
    assert.equal(dupData.hasActiveClaim, true);

    // Clean up temporary student D
    await pool.query('DELETE FROM manual_payment_claims WHERE user_id = $1', [studentD.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [studentD.id]);
  });

  // Scenario G: Admin clicks Approve multiple times
  test('G. Admin clicks Approve multiple times: Only one enrollment exists (idempotency)', async () => {
    // Click approve again on already approved claim A
    const secondApproveRes = await fetch(
      `${BASE_URL}/api/admin/payment-claims/${submittedClaimA.claim_id}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ admin_notes: 'Accidental second click' }),
      }
    );

    const secondApproveData = await secondApproveRes.json();
    assert.equal(secondApproveRes.status, 400);
    assert.match(secondApproveData.error, /already been approved/i);

    // Verify in database: exactly ONE enrollment exists for student A
    const enrollCountRes = await pool.query(
      'SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND course_id = $2',
      [studentA.id, targetCourse.id]
    );
    assert.equal(parseInt(enrollCountRes.rows[0].count, 10), 1);
  });

  // Scenario H: Student attempts to call the admin approval endpoint
  test('H. Student attempts to call the admin approval endpoint: Request is denied (403)', async () => {
    const res = await fetch(
      `${BASE_URL}/api/admin/payment-claims/${submittedClaimA.claim_id}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentAToken}`,
        },
        body: JSON.stringify({ admin_notes: 'Hacked self-approval' }),
      }
    );

    assert.equal(res.status, 403);
  });

  // Scenario I: Existing enrolled student opens their course
  test('I. Existing enrolled student opens their course: Existing valid access continues working', async () => {
    const classroomRes = await fetch(`${BASE_URL}/api/student/courses/${targetCourse.id}/classroom`, {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });

    const data = await classroomRes.json();
    assert.equal(classroomRes.status, 200);
    assert.equal(data.success, true);
    assert(data.data.course);
  });

  // Scenario J: Student refreshes the dashboard
  test('J. Student refreshes the dashboard: The correct payment and enrollment status persists from the database', async () => {
    const dashRes = await fetch(`${BASE_URL}/api/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });

    const dashData = await dashRes.json();
    assert.equal(dashRes.status, 200);
    assert.equal(dashData.success, true);
    assert(dashData.data.enrolledCourses.some((c) => c.course_id === targetCourse.id));
    assert.equal(dashData.data.stats.totalEnrolled, dashData.data.enrolledCourses.length);
  });
});
