import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { coursesRouter } from './routes/courses.js';
import { adminRouter } from './routes/admin.js';
import { studentRouter } from './routes/student.js';
import { paymentsRouter } from './routes/payments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5001;

// CORS setup allowing local development and frontend client
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local dev convenience
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded course resources securely
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'TRADEMAX Institutional API',
    database: process.env.DB_NAME || 'trademax_db',
    timestamp: new Date().toISOString(),
  });
});

// Authentication Routes
app.use('/api/auth', authRouter);

// Courses & Registrations Routes
app.use('/api/courses', coursesRouter);

// Razorpay Payment Gateway Routes
app.use('/api/payments', paymentsRouter);

// Administrator Routes (Protected with RBAC)
app.use('/api/admin', adminRouter);

// Student Portal Routes (Protected)
app.use('/api/student', studentRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred.',
  });
});

// Start Server & Connect to DB
const startServer = async () => {
  try {
    await initDb();
    const server = app.listen(PORT, () => {
      console.log(`[TRADEMAX Server] Running on http://localhost:${PORT}`);
      console.log(`[TRADEMAX Server] Database target: ${process.env.DB_NAME || 'trademax_db'}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[TRADEMAX Server] Port ${PORT} is already in use (server is already running).`);
      } else {
        console.error('[TRADEMAX Server] Server error:', err);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('[TRADEMAX Server] Failed to initialize database or start server:', err);
    process.exit(1);
  }
};

startServer();
