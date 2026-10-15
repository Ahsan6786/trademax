import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'trademax_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl:
    (process.env.DB_HOST && process.env.DB_HOST.includes('rds.amazonaws.com')) ||
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err);
});

export const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log(`[PostgreSQL] Connected to database: ${process.env.DB_NAME || 'trademax_db'}`);

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(50),
        email VARCHAR(255) UNIQUE NOT NULL,
        reference VARCHAR(255),
        trading_experience VARCHAR(50) NOT NULL DEFAULT 'Intermediate',
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        has_seen_welcome BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    // 2. Courses Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        description TEXT,
        thumbnail TEXT DEFAULT '/1-c.jpeg',
        price NUMERIC(10, 2) NOT NULL DEFAULT 19999,
        original_price NUMERIC(10, 2) DEFAULT 24999,
        discount_label VARCHAR(100) DEFAULT 'Save ₹5,000 (20% OFF)',
        duration VARCHAR(100) DEFAULT '1 Month',
        level VARCHAR(100) DEFAULT 'Basic to Advanced',
        learning_mode VARCHAR(100) DEFAULT 'Live Online',
        batch_name VARCHAR(100) DEFAULT 'November',
        seats_available INTEGER DEFAULT 15,
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE courses ALTER COLUMN thumbnail TYPE TEXT;

      CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
      CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);

      -- Seed Primary Course if not exists
      INSERT INTO courses (
        slug, title, subtitle, description, thumbnail, price, original_price,
        discount_label, duration, level, learning_mode, batch_name, seats_available, is_published
      ) VALUES (
        'trading-masterclass',
        'Trading Masterclass',
        'Forex & Crypto Trading',
        'Structured 1-month online program covering market structure, technical analysis, trading psychology, and disciplined risk management.',
        '/1-c.jpeg',
        19999.00,
        24999.00,
        'Save ₹5,000 (20% OFF)',
        '1 Month',
        'Forex & Crypto',
        'Live Online',
        'November',
        15,
        TRUE
      ) ON CONFLICT (slug) DO UPDATE SET
        thumbnail = EXCLUDED.thumbnail,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price;
    `);

    // 3. Enrollments Table (Linked with Users and Courses)
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        course_name VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        trading_experience VARCHAR(50) DEFAULT 'Beginner',
        interest VARCHAR(50) DEFAULT 'Both',
        reference VARCHAR(255),
        batch_name VARCHAR(100) DEFAULT 'November',
        enrollment_status VARCHAR(50) NOT NULL DEFAULT 'enrolled',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'completed',
        amount_paid NUMERIC(10, 2) DEFAULT 19999.00,
        progress_percentage INTEGER DEFAULT 0,
        completed_lessons INTEGER DEFAULT 0,
        total_lessons INTEGER DEFAULT 16,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
      ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_lessons INTEGER DEFAULT 0;
      ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 16;

      CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_email ON enrollments(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_enrollments_created ON enrollments(created_at DESC);
    `);

    // 4. Course Registrations Table (Backwards Compatibility)
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_registrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        trading_experience VARCHAR(50) NOT NULL DEFAULT 'Beginner',
        interest VARCHAR(50) NOT NULL DEFAULT 'Both',
        reference VARCHAR(255),
        course_name VARCHAR(255) NOT NULL DEFAULT 'Trading Masterclass (Forex & Crypto)',
        batch_name VARCHAR(100) NOT NULL DEFAULT 'November',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE course_registrations ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_course_reg_email ON course_registrations(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_course_reg_created ON course_registrations(created_at DESC);
    `);

    // 5. Course Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_settings (
        id SERIAL PRIMARY KEY,
        course_slug VARCHAR(100) UNIQUE NOT NULL DEFAULT 'trading-masterclass',
        batch_name VARCHAR(100) NOT NULL DEFAULT 'November',
        seats_available INTEGER NOT NULL DEFAULT 15,
        show_seat_count BOOLEAN NOT NULL DEFAULT FALSE,
        announcement_text VARCHAR(255) NOT NULL DEFAULT 'November Batch — Limited Seats Available',
        contact_phone VARCHAR(50) NOT NULL DEFAULT '8799026206',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO course_settings (course_slug, batch_name, seats_available, show_seat_count, announcement_text, contact_phone)
      VALUES ('trading-masterclass', 'November', 15, FALSE, 'November Batch — Limited Seats Available', '8799026206')
      ON CONFLICT (course_slug) DO NOTHING;
    `);

    // 6. Announcements Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'General',
        published_date DATE DEFAULT CURRENT_DATE,
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_announcements_pub ON announcements(is_published, created_at DESC);
    `);

    // 7. Live Classes Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS live_classes (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        batch_name VARCHAR(100) DEFAULT 'November',
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        duration_minutes INTEGER DEFAULT 75,
        meeting_link VARCHAR(500),
        platform VARCHAR(100) DEFAULT 'Live Online',
        instructor VARCHAR(100) DEFAULT 'Patil Trader',
        status VARCHAR(50) DEFAULT 'upcoming',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500);

      CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled ON live_classes(scheduled_at ASC);
    `);

    // 8. Secure Database Seeding for Admin Account
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@trademaxclub.in').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'TradeMax@2026';

    const adminCheck = await client.query(
      'SELECT id, email, role FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [adminEmail]
    );

    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    if (adminCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (
          name, mobile, email, reference, trading_experience, password, role, status, has_seen_welcome
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'TradeMax Administrator',
          '8799026206',
          adminEmail,
          'Institutional',
          'Professional',
          hashedAdminPassword,
          'admin',
          'active',
          true,
        ]
      );
      console.log(`[PostgreSQL] Seeded Administrator account: ${adminEmail}`);
    } else {
      // Ensure role is admin and password stays valid as configured in env
      await client.query(
        `UPDATE users
         SET role = 'admin', password = $1, status = 'active', updated_at = CURRENT_TIMESTAMP
         WHERE LOWER(email) = $2`,
        [hashedAdminPassword, adminEmail]
      );
      console.log(`[PostgreSQL] Verified and synced Administrator account: ${adminEmail}`);
    }

    console.log('[PostgreSQL] Database tables, relationships, and admin account verified successfully.');
  } finally {
    client.release();
  }
};
