import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import {
  generatePresignedDownloadUrl,
  getS3ObjectStream,
  uploadObjectToS3,
  verifyS3Object,
  getMimeType,
  formatContentDisposition,
} from './s3Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Directory for temporary / fallback uploads. Override with UPLOAD_DIR to point
 * at a persistent volume. Course materials themselves must live in S3.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads');

/** Local-disk fallback is only tolerated outside production (disk is ephemeral on deploys). */
export function isLocalUploadFallbackAllowed() {
  if (process.env.ALLOW_LOCAL_UPLOAD_FALLBACK === 'true') return true;
  if (process.env.ALLOW_LOCAL_UPLOAD_FALLBACK === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

const S3_KEY_PATTERN = /^courses\/[^\s]+$/;

/** Normalize an external link: add a scheme if missing and expand Google Drive share links. */
export function normalizeExternalUrl(raw) {
  let url = (raw || '').trim();
  if (!url || url === '#') return null;
  if (url.startsWith('//')) url = `https:${url}`;
  else if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith('/') || !/^[\w-]+(\.[\w-]+)+(\/|$)/.test(url)) return null;
    url = `https://${url}`;
  }

  let viewUrl = url;
  let downloadUrl = url;
  const drive = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=)([\w-]+)/i);
  if (drive) {
    viewUrl = `https://drive.google.com/file/d/${drive[1]}/preview`;
    downloadUrl = `https://drive.google.com/uc?export=download&id=${drive[1]}`;
  }
  return { url, viewUrl, downloadUrl, isDrive: Boolean(drive) };
}

function localFileFor(resource) {
  const url = resource.resource_url || '';
  if (!url.startsWith('/uploads/')) return null;
  return path.resolve(UPLOAD_DIR, path.basename(url));
}

function wantsJson(req) {
  return req.query.json === 'true' || req.headers.accept?.includes('application/json');
}

export function logMissingResource(scope, req, resource, checked) {
  console.error(
    `[${scope} Resource Missing] course=${req.params.courseId} resource=${resource.id} ` +
      `user=${req.user?.id} title="${resource.title}" s3_key=${resource.s3_key || 'null'} ` +
      `resource_url=${resource.resource_url || 'null'} checked=[${checked.join(', ')}]`
  );
}

/**
 * Serve a course resource from S3, local disk, or an external link.
 * Authorization must be completed by the caller before invoking this.
 * `scope` is 'student' or 'admin' and only affects log labels / stream URL.
 */
export async function deliverResource({ req, res, resource, courseId, scope }) {
  const label = scope === 'admin' ? 'Admin' : 'Student';
  const fileName = resource.file_name || `${resource.title || 'course-material'}.pdf`;
  const mimeType = resource.content_type || getMimeType(fileName);
  const isInline = req.query.inline === 'true' || req.query.view === 'true';
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const effectiveMimeType = isPdf ? 'application/pdf' : mimeType;
  const dispositionType = isInline ? 'inline' : 'attachment';
  const checked = [];

  const presign = (key, disposition) =>
    generatePresignedDownloadUrl({
      key,
      filename: fileName,
      contentType: effectiveMimeType,
      dispositionType: disposition,
      expiresIn: 900,
    });

  const sendS3 = async (key) => {
    if (req.query.stream === 'true' || req.query.proxy === 'true') {
      try {
        const s3Obj = await getS3ObjectStream({ key, range: req.headers.range });
        res.setHeader('Content-Type', effectiveMimeType);
        res.setHeader('Content-Disposition', formatContentDisposition(fileName, dispositionType));
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=3600');
        if (s3Obj.ContentRange) {
          res.status(206);
          res.setHeader('Content-Range', s3Obj.ContentRange);
        }
        if (s3Obj.ContentLength) res.setHeader('Content-Length', s3Obj.ContentLength);
        if (s3Obj.ETag) res.setHeader('ETag', s3Obj.ETag);
        return s3Obj.Body.pipe(res);
      } catch (streamErr) {
        console.warn(`[${label} S3 Stream Warning - fallback to presigned redirect]:`, streamErr.message);
      }
    }

    const viewUrl = await presign(key, 'inline');
    const downloadUrl = await presign(key, 'attachment');
    if (wantsJson(req)) {
      return res.json({
        success: true,
        url: isInline ? viewUrl : downloadUrl,
        viewUrl,
        downloadUrl,
        streamUrl: `/api/${scope === 'admin' ? 'admin' : 'student'}/courses/${courseId}/resources/${resource.id}/view?stream=true`,
        fileName,
        fileSize: resource.file_size,
        contentType: effectiveMimeType,
        isPdf,
        isInline,
      });
    }
    return res.redirect(302, isInline ? viewUrl : downloadUrl);
  };

  // 1. S3 (explicit s3_key, or a legacy row whose resource_url holds the S3 key)
  let s3Key = resource.s3_key || null;
  let legacyKey = false;
  if (!s3Key && S3_KEY_PATTERN.test(resource.resource_url || '')) {
    s3Key = resource.resource_url;
    legacyKey = true;
  }
  if (s3Key) {
    checked.push(`s3:${s3Key}`);
    let exists = true;
    try {
      exists = (await verifyS3Object({ key: s3Key })).exists;
    } catch (headErr) {
      // Can't verify (e.g. no HeadObject permission) - optimistically serve.
      console.warn(`[${label} S3 Head Warning]: ${headErr.message}`);
    }
    if (exists) {
      if (legacyKey) {
        pool
          .query('UPDATE course_resources SET s3_key = $1 WHERE id = $2 AND s3_key IS NULL', [s3Key, resource.id])
          .catch((e) => console.warn('[Resource s3_key backfill failed]:', e.message));
      }
      return sendS3(s3Key);
    }
    console.error(`[${label} Resource] S3 object not found: ${s3Key} (resource ${resource.id})`);
  }

  // 2. Local disk
  const filePath = localFileFor(resource);
  if (filePath) {
    checked.push(`local:${filePath}`);
    if (fs.existsSync(filePath)) {
      // Migrate to persistent storage opportunistically
      try {
        const migratedKey = `courses/${courseId}/resources/${resource.id}/${encodeURIComponent(fileName)}`;
        const stat = fs.statSync(filePath);
        await uploadObjectToS3({
          key: migratedKey,
          body: fs.createReadStream(filePath),
          contentType: effectiveMimeType,
          contentLength: stat.size,
        });
        await pool.query('UPDATE course_resources SET s3_key = $1, content_type = $2 WHERE id = $3', [
          migratedKey,
          effectiveMimeType,
          resource.id,
        ]);
        console.log(`[${label} Resource] migrated local file to S3: resource=${resource.id} key=${migratedKey}`);
        return sendS3(migratedKey);
      } catch (migrateErr) {
        console.warn(`[${label} Resource] S3 migration failed, streaming local file:`, migrateErr.message);
      }
      res.setHeader('Content-Type', effectiveMimeType);
      res.setHeader('Content-Disposition', formatContentDisposition(fileName, dispositionType));
      res.setHeader('Content-Length', fs.statSync(filePath).size);
      return fs.createReadStream(filePath).pipe(res);
    }
    console.error(
      `[${label} Resource] local file missing (likely wiped by redeploy / ephemeral disk): ${filePath} (resource ${resource.id})`
    );
  }

  // 3. External link
  const external = normalizeExternalUrl(resource.resource_url);
  if (external) {
    checked.push(`external:${external.url}`);
    if (wantsJson(req)) {
      return res.json({
        success: true,
        url: isInline ? external.viewUrl : external.downloadUrl,
        viewUrl: external.viewUrl,
        downloadUrl: external.downloadUrl,
        fileName,
        isExternal: true,
        isPdf,
        isInline,
      });
    }
    return res.redirect(302, isInline ? external.viewUrl : external.downloadUrl);
  }

  logMissingResource(label, req, resource, checked);
  return res.status(404).json({
    success: false,
    code: 'RESOURCE_FILE_MISSING',
    error:
      'This course material file is currently unavailable. Please contact support so the instructor can re-upload it.',
  });
}

