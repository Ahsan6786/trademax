import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Private storage directory (NEVER served via public express.static)
export const PRIVATE_SCREENSHOTS_DIR = path.resolve(__dirname, '../../uploads/private_screenshots');
export const PRIVATE_QR_DIR = path.resolve(__dirname, '../../uploads/qr_codes');

// Ensure private directories exist with secure permissions
if (!fs.existsSync(PRIVATE_SCREENSHOTS_DIR)) {
  fs.mkdirSync(PRIVATE_SCREENSHOTS_DIR, { recursive: true, mode: 0o700 });
}
if (!fs.existsSync(PRIVATE_QR_DIR)) {
  fs.mkdirSync(PRIVATE_QR_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Validates image buffer magic bytes against supported image signatures:
 * - JPEG (SOI marker 0xFF 0xD8 0xFF)
 * - PNG (\x89PNG\r\n\x1a\n)
 * - WebP (RIFF .... WEBP)
 */
export function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 8) {
    return { valid: false, error: 'File is too small or empty.' };
  }

  // Check JPEG: SOI marker 0xFF 0xD8
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { valid: true, mimeType: 'image/jpeg', extension: 'jpg' };
  }

  // Check PNG: 89 50 4e 47 0d 0a 1a 0a
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: 'image/png', extension: 'png' };
  }

  // Check WebP: bytes 0-3 'RIFF' and bytes 8-11 'WEBP'
  if (buffer.length >= 12) {
    const riff = buffer.subarray(0, 4).toString('ascii');
    const webp = buffer.subarray(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') {
      return { valid: true, mimeType: 'image/webp', extension: 'webp' };
    }
  }

  return {
    valid: false,
    error: 'Invalid image format. Only authentic JPEG, PNG, and WebP images are permitted.',
  };
}

/**
 * Validates and saves a private payment screenshot.
 * Generates an unguessable storage key and prevents path traversal.
 */
export async function savePrivateScreenshot({ buffer, originalName }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Valid file buffer is required.');
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB limit
  if (buffer.length > MAX_SIZE) {
    throw new Error('Screenshot file size exceeds the 10MB limit.');
  }

  const validation = validateImageMagicBytes(buffer);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generate cryptographically secure storage key
  const randomKey = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const filename = `claim_${timestamp}_${randomKey}.${validation.extension}`;
  const filePath = path.join(PRIVATE_SCREENSHOTS_DIR, filename);

  await fs.promises.writeFile(filePath, buffer, { mode: 0o600 });

  return {
    storagePath: filename,
    fullPath: filePath,
    mimeType: validation.mimeType,
    extension: validation.extension,
    sizeBytes: buffer.length,
    originalName: path.basename(originalName || `screenshot.${validation.extension}`).slice(0, 255),
  };
}

/**
 * Validates and saves an uploaded admin QR code image.
 */
export async function saveAdminQrCode({ buffer, originalName }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Valid file buffer is required.');
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB limit
  if (buffer.length > MAX_SIZE) {
    throw new Error('QR code image file size exceeds the 10MB limit.');
  }

  const validation = validateImageMagicBytes(buffer);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const randomKey = crypto.randomBytes(12).toString('hex');
  const filename = `qr_${Date.now()}_${randomKey}.${validation.extension}`;
  const filePath = path.join(PRIVATE_QR_DIR, filename);

  await fs.promises.writeFile(filePath, buffer, { mode: 0o644 });

  return {
    storageKey: filename,
    url: `/api/payments/qr-image/${filename}`,
    mimeType: validation.mimeType,
    sizeBytes: buffer.length,
  };
}

/**
 * Retrieves a private screenshot file path safely after verifying it stays inside private directory.
 */
export function getPrivateScreenshotFilePath(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') {
    return null;
  }

  // Sanitize and prevent directory traversal
  const safeFilename = path.basename(storagePath);
  const fullPath = path.join(PRIVATE_SCREENSHOTS_DIR, safeFilename);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fullPath;
}

/**
 * Retrieves an admin-uploaded QR code file path safely.
 */
export function getQrCodeFilePath(storageKey) {
  if (!storageKey || typeof storageKey !== 'string') {
    return null;
  }

  const safeFilename = path.basename(storageKey);
  const fullPath = path.join(PRIVATE_QR_DIR, safeFilename);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fullPath;
}
