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
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS topics JSONB;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_outcomes TEXT;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS objectives TEXT;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS syllabus TEXT;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(255) DEFAULT 'Patil Trader';
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_bio TEXT;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_image TEXT DEFAULT '/heroo.png';
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS methodology TEXT;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS assignments_info TEXT;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS assessment_info TEXT;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_enquiry_only BOOLEAN DEFAULT FALSE;

      CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
      CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);

      -- Seed / Upsert Professional Courses Catalogue
      -- 1. Basics to Advanced Course (Existing Course - preserve slug and associations)
      INSERT INTO courses (
        slug, title, subtitle, description, thumbnail, price, original_price,
        discount_label, duration, level, learning_mode, batch_name, seats_available, is_published,
        topics, learning_outcomes, is_enquiry_only
      ) VALUES (
        'trading-masterclass',
        'Basics to Advanced Course',
        'Forex & Crypto Trading Masterclass',
        'A comprehensive foundation to advanced curriculum covering market structure, technical analysis, trading psychology, and disciplined risk management across Forex and Crypto markets.',
        '/1-c.jpeg',
        20000.00,
        25000.00,
        'Save ₹5,000 (20% OFF)',
        '30 Days',
        'Basic to Advanced',
        'Live Online',
        'November',
        15,
        TRUE,
        '["Forex & Crypto Institutional Trading", "Technical Analysis & Market Structure", "Trading Psychology & Discipline", "Risk Management & Trade Planning", "Strategy Development", "Backtesting & Forward Testing", "Live Market Analysis for Educational Practice", "Trade Execution & Management", "TradingView & Chart Analysis", "Common Trading Mistakes and How to Avoid Them"]'::jsonb,
        'Develop a structured, disciplined trading foundation with clear risk controls and institutional price action understanding.',
        FALSE
      ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        price = EXCLUDED.price,
        duration = EXCLUDED.duration,
        topics = COALESCE(EXCLUDED.topics, courses.topics),
        learning_outcomes = COALESCE(EXCLUDED.learning_outcomes, courses.learning_outcomes),
        is_enquiry_only = EXCLUDED.is_enquiry_only;

      -- 2. Professional Technical Analysis
      INSERT INTO courses (
        slug, title, subtitle, description, thumbnail, price, original_price,
        discount_label, duration, level, learning_mode, batch_name, seats_available, is_published,
        topics, learning_outcomes, is_enquiry_only
      ) VALUES (
        'professional-technical-analysis',
        'Professional Technical Analysis',
        'Structured Technical Analysis & Price Action',
        'Learn to analyze financial markets using structured technical analysis.',
        '/7999.jpeg',
        7999.00,
        9999.00,
        'Save ₹2,000 (20% OFF)',
        '7 Days',
        'Intermediate to Advanced',
        'Live Online',
        'November',
        20,
        TRUE,
        '["Market Structure & Trends", "Support and Resistance", "Supply and Demand Zones", "Candlestick Patterns", "Price Action", "Trendlines", "Breakouts", "Liquidity Concepts", "Market Structure Shifts", "Multi-Timeframe Analysis", "Practical Chart Analysis"]'::jsonb,
        'Develop a structured approach to reading charts and identifying potential trading opportunities.',
        FALSE
      ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        description = EXCLUDED.description,
        thumbnail = EXCLUDED.thumbnail,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        duration = EXCLUDED.duration,
        topics = EXCLUDED.topics,
        learning_outcomes = EXCLUDED.learning_outcomes,
        is_enquiry_only = EXCLUDED.is_enquiry_only;

      -- 3. Trading Psychology Development
      INSERT INTO courses (
        slug, title, subtitle, description, thumbnail, price, original_price,
        discount_label, duration, level, learning_mode, batch_name, seats_available, is_published,
        topics, learning_outcomes, is_enquiry_only
      ) VALUES (
        'trading-psychology-development',
        'Trading Psychology Development',
        'Discipline, Emotional Control & Mindset',
        'Develop the discipline and emotional control required for consistent execution of a trading plan.',
        '/training-6999.jpeg',
        6999.00,
        8999.00,
        'Save ₹2,000 (22% OFF)',
        '5 Days',
        'All Experience Levels',
        'Live Online',
        'November',
        20,
        TRUE,
        '["Trading Mindset", "Fear and Greed", "FOMO", "Revenge Trading", "Overtrading", "Managing Losses", "Patience", "Emotional Control", "Trading Journals", "Performance Reviews"]'::jsonb,
        'Build better trading habits and learn to follow predefined trading rules.',
        FALSE
      ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        description = EXCLUDED.description,
        thumbnail = EXCLUDED.thumbnail,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        duration = EXCLUDED.duration,
        topics = EXCLUDED.topics,
        learning_outcomes = EXCLUDED.learning_outcomes,
        is_enquiry_only = EXCLUDED.is_enquiry_only;

      -- 4. Professional Risk Management
      INSERT INTO courses (
        slug, title, subtitle, description, thumbnail, price, original_price,
        discount_label, duration, level, learning_mode, batch_name, seats_available, is_published,
        topics, learning_outcomes, is_enquiry_only
      ) VALUES (
        'professional-risk-management',
        'Professional Risk Management',
        'Capital Preservation & Exposure Control',
        'Learn to manage trading exposure and protect capital through structured risk management.',
        '/professional-6999.jpeg',
        6999.00,
        8999.00,
        'Save ₹2,000 (22% OFF)',
        '5 Days',
        'All Experience Levels',
        'Live Online',
        'November',
        20,
        TRUE,
        '["Capital Preservation", "Risk-per-Trade Calculations", "Position Sizing", "Lot-Size Calculations", "Leverage", "Exposure", "Stop-Loss Placement", "Risk-to-Reward Ratios", "Drawdown", "Daily Loss Limits", "Personal Risk-Management Planning"]'::jsonb,
        'Learn to calculate trade risk, control exposure, and develop a structured risk-management plan.',
        FALSE
      ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        description = EXCLUDED.description,
        thumbnail = EXCLUDED.thumbnail,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        duration = EXCLUDED.duration,
        topics = EXCLUDED.topics,
        learning_outcomes = EXCLUDED.learning_outcomes,
        is_enquiry_only = EXCLUDED.is_enquiry_only;

      -- 5. Advanced Professional Strategy Development
      INSERT INTO courses (
        slug, title, subtitle, description, thumbnail, price, original_price,
        discount_label, duration, level, learning_mode, batch_name, seats_available, is_published,
        topics, learning_outcomes, is_enquiry_only
      ) VALUES (
        'advanced-professional-strategy-development',
        'Advanced Professional Strategy Development',
        'Rule-Based Strategy Refinement & Testing',
        'An advanced program for experienced traders who want to develop, test, and refine their own rule-based trading strategies.',
        '/14999.jpeg',
        14999.00,
        18999.00,
        'Save ₹4,000 (21% OFF)',
        '14 Days',
        'Advanced & Experienced Traders',
        'Live Online',
        'November',
        15,
        TRUE,
        '["Strategy Frameworks", "Market Selection", "Market Structure", "Liquidity Concepts", "Entry and Exit Models", "Higher-Timeframe Bias", "Lower-Timeframe Execution", "Stop-Loss and Target Rules", "Historical Backtesting", "Forward Testing", "Trade Journaling", "Win Rate", "Expectancy", "Drawdown Analysis", "Strategy Refinement", "Final Assessment"]'::jsonb,
        'Develop a documented trading strategy with predefined rules, measurable performance criteria, and a structured improvement plan.',
        FALSE
      ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        description = EXCLUDED.description,
        thumbnail = EXCLUDED.thumbnail,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        duration = EXCLUDED.duration,
        topics = EXCLUDED.topics,
        learning_outcomes = EXCLUDED.learning_outcomes,
        is_enquiry_only = EXCLUDED.is_enquiry_only;

      -- 6. Villa Trading Experience (Exclusive In-Person Immersion)
      INSERT INTO courses (
        slug, title, subtitle, description, thumbnail, price, original_price,
        discount_label, duration, level, learning_mode, batch_name, seats_available, is_published,
        topics, learning_outcomes, is_enquiry_only
      ) VALUES (
        'villa-trading-experience',
        'Villa Trading Experience',
        'Exclusive In-Person Trading Immersion',
        'An exclusive villa-based trading experience intended for professional and experienced traders.',
        '/villa.png',
        0.00,
        0.00,
        'Contact for Pricing',
        'Enquiry Based',
        'Professional Traders',
        'In-Person Immersion',
        'Enquiry Based',
        8,
        TRUE,
        '["Program Format and Schedule", "Eligibility Requirements", "Practical Trading Activities", "Group Size", "Participation Details", "Pricing", "Availability"]'::jsonb,
        'Immersive in-person trading environment with live desk routines, real-time market execution, and peer collaborative reviews.',
        TRUE
      ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        subtitle = EXCLUDED.subtitle,
        description = EXCLUDED.description,
        thumbnail = EXCLUDED.thumbnail,
        price = EXCLUDED.price,
        duration = EXCLUDED.duration,
        topics = EXCLUDED.topics,
        learning_outcomes = EXCLUDED.learning_outcomes,
        is_enquiry_only = EXCLUDED.is_enquiry_only;

      -- 7. Enquiries Table for Villa Trading Experience & Special Programs
      CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        course_slug VARCHAR(100) DEFAULT 'villa-trading-experience',
        course_name VARCHAR(255) DEFAULT 'Villa Trading Experience',
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        trading_experience VARCHAR(50) DEFAULT 'Intermediate',
        message TEXT,
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_enquiries_email ON enquiries(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries(created_at DESC);
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

    // 8. Payments Table (Razorpay Orders, Transactions, Signatures & Webhooks)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE SET NULL,
        order_id VARCHAR(100) UNIQUE NOT NULL,
        payment_id VARCHAR(100) UNIQUE,
        signature VARCHAR(255),
        amount NUMERIC(10, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'INR',
        status VARCHAR(50) NOT NULL DEFAULT 'created',
        method VARCHAR(50),
        bank VARCHAR(100),
        wallet VARCHAR(100),
        vpa VARCHAR(255),
        error_code VARCHAR(100),
        error_description TEXT,
        receipt VARCHAR(100),
        notes JSONB,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_mobile VARCHAR(50),
        raw_payload JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS order_id VARCHAR(100);
      ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);
      ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
      ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100);

      CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_enrollments_order_id ON enrollments(order_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_payment_id ON enrollments(payment_id);
    `);

    // 9. Recorded Video Lessons & Modules Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_lessons (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        module_name VARCHAR(255) DEFAULT 'Core Curriculum',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        sort_order INTEGER DEFAULT 1,
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id, sort_order ASC);
    `);

    // 10. Student Lesson Progress Tracking Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
        is_completed BOOLEAN NOT NULL DEFAULT TRUE,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, lesson_id)
      );

      CREATE INDEX IF NOT EXISTS idx_lesson_prog_user_course ON lesson_progress(user_id, course_id);
      CREATE INDEX IF NOT EXISTS idx_lesson_prog_lesson ON lesson_progress(lesson_id);
    `);

    // 11. Course Posts, Notes, PDFs, Assignments & Resources Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_resources (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        resource_type VARCHAR(50) DEFAULT 'pdf',
        resource_url TEXT,
        file_name VARCHAR(255),
        file_size VARCHAR(50),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_course_resources_course ON course_resources(course_id, created_at DESC);
    `);

    // 12. Course-Specific In-App Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS course_notifications (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'announcement',
        reference_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_course_notif_course ON course_notifications(course_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_course_notif_user ON course_notifications(user_id, is_read);
    `);

    // 13. Ensure Announcements and Live Classes have course_id & indexes
    await client.query(`
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author VARCHAR(100) DEFAULT 'Patil Trader';
      CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);

      ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL;
      ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500);
      CREATE INDEX IF NOT EXISTS idx_live_classes_course ON live_classes(course_id, scheduled_at ASC);

      -- 14. Course Modules Table & Additive S3 Video Storage Schema
      CREATE TABLE IF NOT EXISTS course_modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        sort_order INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id, sort_order ASC);

      -- Additive S3 and metadata columns for course_lessons (S3 video storage)
      ALTER TABLE course_lessons ALTER COLUMN video_url DROP NOT NULL;
      ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500);
      ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100) DEFAULT 'November';
      ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
      ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS content_type VARCHAR(100) DEFAULT 'video/mp4';
      ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS file_size BIGINT;
      ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS release_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE course_lessons ADD COLUMN IF NOT EXISTS module_id INTEGER REFERENCES course_modules(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_course_lessons_s3_key ON course_lessons(s3_key);
      CREATE INDEX IF NOT EXISTS idx_course_lessons_batch ON course_lessons(course_id, batch_name);

      -- Additive columns for live_classes (Google Meet & instructions)
      ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS instructions TEXT;
      ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;
      ALTER TABLE live_classes ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;

      -- Additive columns for announcements
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100) DEFAULT 'All Batches';
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS attachment_url TEXT;
      ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

      -- Additive columns for course_resources (materials)
      ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100) DEFAULT 'All Batches';
      ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500);
      ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;

      -- Additive columns for course_notifications
      ALTER TABLE course_notifications ADD COLUMN IF NOT EXISTS batch_name VARCHAR(100) DEFAULT 'All Batches';
    `);
    // Database initialized without dummy or placeholder course content.
    // Real curriculum content is published exclusively by authorized administrators.


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
