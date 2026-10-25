import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'trademax_jwt_default_secret_key';
const API_BASE = 'http://localhost:5001/api';

const createAuthToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
};

describe('Course Material Upload & Download Functionality Suite', () => {
  let adminUser;
  let enrolledStudent;
  let unenrolledStudent;
  let adminToken;
  let enrolledToken;
  let unenrolledToken;
  let testCourse;
  let uploadedResources = [];

  before(async () => {
    // 0. Clean prior test records
    await pool.query("DELETE FROM users WHERE email LIKE 'mat-test-%@trademax.in'");
    await pool.query("DELETE FROM courses WHERE slug = 'test-course-material-course'");

    // 1. Create Test Admin
    const adminRes = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ('Material Admin', 'mat-test-admin@trademax.in', 'hashed_pass_2026', 'admin')
       RETURNING id, name, email, role`
    );
    adminUser = adminRes.rows[0];
    adminToken = createAuthToken(adminUser);

    // 2. Create Enrolled Student
    const student1Res = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ('Enrolled Student', 'mat-test-student1@trademax.in', 'hashed_pass_2026', 'student')
       RETURNING id, name, email, role`
    );
    enrolledStudent = student1Res.rows[0];
    enrolledToken = createAuthToken(enrolledStudent);

    // 3. Create Unenrolled Student
    const student2Res = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ('Unenrolled Student', 'mat-test-student2@trademax.in', 'hashed_pass_2026', 'student')
       RETURNING id, name, email, role`
    );
    unenrolledStudent = student2Res.rows[0];
    unenrolledToken = createAuthToken(unenrolledStudent);

    // 4. Create Test Course
    const courseRes = await pool.query(
      `INSERT INTO courses (
         title, subtitle, description, price, original_price, duration, learning_mode,
         batch_name, seats_available, slug, is_published
       ) VALUES (
         'Material Test Course', 'Testing Materials', 'Course for material upload/download testing',
         4999, 9999, '10 Days', 'Live Online', 'November', 25, 'test-course-material-course', true
       )
       RETURNING id, title, slug`
    );
    testCourse = courseRes.rows[0];

    // 5. Enroll Student 1 into Course
    await pool.query(
      `INSERT INTO enrollments (
         user_id, course_id, course_name, name, email, mobile,
         batch_name, enrollment_status, payment_status, amount_paid
       ) VALUES ($1, $2, $3, $4, $5, '9876543210', 'November', 'enrolled', 'completed', 4999.00)`,
      [enrolledStudent.id, testCourse.id, testCourse.title, enrolledStudent.name, enrolledStudent.email]
    );
  });

  after(async () => {
    try {
      await pool.query('DELETE FROM courses WHERE id = $1', [testCourse.id]);
      await pool.query("DELETE FROM users WHERE email LIKE 'mat-test-%@trademax.in'");
    } catch {}
  });

  it('1. Admin uploads PDF with spaces in filename', async () => {
    const filename = 'Risk Management Strategy 2026.pdf';
    const fileContent = Buffer.from('%PDF-1.4\n% TradeMax Test PDF Content\n%%EOF');
    const formData = new FormData();
    formData.append('title', 'Risk Management Strategy Sheet');
    formData.append('description', 'Comprehensive risk calculation formula sheet');
    formData.append('resource_type', 'pdf');
    formData.append('batch_name', 'All Batches');
    formData.append('file', new Blob([fileContent], { type: 'application/pdf' }), filename);

    const res = await fetch(`${API_BASE}/admin/courses/${testCourse.id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    const data = await res.json();
    assert.equal(res.status, 201, `Expected status 201, got ${res.status}: ${JSON.stringify(data)}`);
    assert.equal(data.success, true);
    assert.equal(data.resource.title, 'Risk Management Strategy Sheet');
    assert.equal(data.resource.file_name, filename);
    assert.equal(data.resource.content_type, 'application/pdf');
    uploadedResources.push(data.resource);
  });

  it('2. Admin uploads PPTX presentation with spaces in filename', async () => {
    const filename = 'Advanced Price Action Masterclass.pptx';
    const fileContent = Buffer.from('PK\x03\x04 TradeMax Simulated PPTX Archive Content');
    const formData = new FormData();
    formData.append('title', 'Price Action Masterclass Slides');
    formData.append('description', 'Full lecture slides for Day 3');
    formData.append('resource_type', 'presentation');
    formData.append('batch_name', 'All Batches');
    formData.append(
      'file',
      new Blob([fileContent], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }),
      filename
    );

    const res = await fetch(`${API_BASE}/admin/courses/${testCourse.id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.resource.file_name, filename);
    assert.equal(
      data.resource.content_type,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    uploadedResources.push(data.resource);
  });

  it('3. Admin uploads DOCX document with spaces in filename', async () => {
    const filename = 'Trading Plan Template & Journal.docx';
    const fileContent = Buffer.from('PK\x03\x04 TradeMax Simulated DOCX Content');
    const formData = new FormData();
    formData.append('title', 'Trading Plan Template');
    formData.append('description', 'Fillable trade journal and execution rubric');
    formData.append('resource_type', 'document');
    formData.append('batch_name', 'All Batches');
    formData.append(
      'file',
      new Blob([fileContent], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      filename
    );

    const res = await fetch(`${API_BASE}/admin/courses/${testCourse.id}/resources`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      body: formData,
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.resource.file_name, filename);
    assert.equal(
      data.resource.content_type,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    uploadedResources.push(data.resource);
  });

  it('4. Student classroom query lists all uploaded materials with correct metadata', async () => {
    const res = await fetch(`${API_BASE}/student/courses/${testCourse.id}/classroom`, {
      headers: {
        Authorization: `Bearer ${enrolledToken}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.data.resources.length >= 3);

    const pdfRes = data.data.resources.find((r) => r.file_name === 'Risk Management Strategy 2026.pdf');
    const pptxRes = data.data.resources.find((r) => r.file_name === 'Advanced Price Action Masterclass.pptx');
    const docxRes = data.data.resources.find((r) => r.file_name === 'Trading Plan Template & Journal.docx');

    assert.ok(pdfRes, 'PDF resource must be listed in classroom');
    assert.ok(pptxRes, 'PPTX resource must be listed in classroom');
    assert.ok(docxRes, 'DOCX resource must be listed in classroom');
  });

  it('5. Enrolled student can retrieve download URL (JSON endpoint) for PDF', async () => {
    const pdf = uploadedResources[0];
    const res = await fetch(
      `${API_BASE}/student/courses/${testCourse.id}/resources/${pdf.id}/download?json=true`,
      {
        headers: {
          Authorization: `Bearer ${enrolledToken}`,
          Accept: 'application/json',
        },
      }
    );

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.fileName, 'Risk Management Strategy 2026.pdf');
    assert.ok(data.downloadUrl, 'Must return a downloadUrl');
  });

  it('6. Enrolled student download request handles redirect / stream with correct headers', async () => {
    const pptx = uploadedResources[1];
    const res = await fetch(
      `${API_BASE}/student/courses/${testCourse.id}/resources/${pptx.id}/download`,
      {
        headers: {
          Authorization: `Bearer ${enrolledToken}`,
        },
        redirect: 'manual', // do not follow redirect so we can inspect status & headers
      }
    );

    // If S3 is active, it returns 302 redirect to presigned S3 URL
    // If local storage fallback, it returns 200 with Content-Disposition
    if (res.status === 302) {
      const location = res.headers.get('location');
      assert.ok(location, '302 must provide Location header');
      assert.ok(
        location.includes('response-content-disposition') || location.includes('Advanced%20Price%20Action'),
        'Presigned S3 URL must preserve Content-Disposition with original filename'
      );
    } else {
      assert.equal(res.status, 200);
      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition, 'Must have Content-Disposition header');
      assert.ok(disposition.includes('attachment'), 'Content-Disposition must be attachment');
      assert.ok(disposition.includes('Advanced Price Action Masterclass.pptx'));
    }
  });

  it('7. Unenrolled student is strictly blocked from downloading course materials (403 Forbidden)', async () => {
    const pdf = uploadedResources[0];
    const res = await fetch(
      `${API_BASE}/student/courses/${testCourse.id}/resources/${pdf.id}/download`,
      {
        headers: {
          Authorization: `Bearer ${unenrolledToken}`,
        },
      }
    );

    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.ok(data.error.includes('enrolled'));
  });

  it('8. Unauthenticated request is strictly rejected (401 Unauthorized)', async () => {
    const pdf = uploadedResources[0];
    const res = await fetch(
      `${API_BASE}/student/courses/${testCourse.id}/resources/${pdf.id}/download`
    );

    assert.equal(res.status, 401);
  });

  it('9. Admin can download course materials successfully', async () => {
    const docx = uploadedResources[2];
    const res = await fetch(
      `${API_BASE}/admin/courses/${testCourse.id}/resources/${docx.id}/download?json=true`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Accept: 'application/json',
        },
      }
    );

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.fileName, 'Trading Plan Template & Journal.docx');
    assert.ok(data.downloadUrl);
  });

  it('10. Legacy local course material without S3 key streams properly with Content-Disposition', async () => {
    // Create a dummy file in uploads
    const uploadsDir = path.resolve(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const legacyFilename = 'legacy-test-doc-123.pdf';
    const legacyPath = path.resolve(uploadsDir, legacyFilename);
    fs.writeFileSync(legacyPath, '%PDF-1.4\n% Legacy TradeMax PDF\n%%EOF');

    const legacyRes = await pool.query(
      `INSERT INTO course_resources (
         course_id, title, description, resource_type, resource_url, s3_key,
         file_name, file_size, content_type, batch_name
       ) VALUES ($1, 'Legacy Risk Doc', 'Old syllabus guide', 'pdf', $2, NULL, 'Legacy Risk Management.pdf', '15 KB', 'application/pdf', 'All Batches')
       RETURNING id`,
      [testCourse.id, `/uploads/${legacyFilename}`]
    );

    const legacyId = legacyRes.rows[0].id;

    const res = await fetch(
      `${API_BASE}/student/courses/${testCourse.id}/resources/${legacyId}/download`,
      {
        headers: {
          Authorization: `Bearer ${enrolledToken}`,
        },
        redirect: 'manual',
      }
    );

    // Can be 200 stream or 302 presigned url if auto-migrated
    assert.ok([200, 302].includes(res.status), `Expected 200 or 302, got ${res.status}`);
    if (res.status === 200) {
      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition.includes('attachment'));
      assert.ok(disposition.includes('Legacy Risk Management.pdf'));
    }

    try { fs.unlinkSync(legacyPath); } catch {}
  });
});
