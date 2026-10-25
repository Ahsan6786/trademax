import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const region = process.env.AWS_REGION || 'ap-south-1';
export const S3_BUCKET = process.env.AWS_S3_BUCKET || 'trademax-course-videos-prod-861097501558';

// Initialize S3 Client
// In Production EC2: uses IAM Instance Profile (TradeMaxEC2S3Role) automatically.
// In Local Dev: uses local AWS credentials / profile (trademax or default)
export const s3Client = new S3Client({
  region,
});

/**
 * Generate a short-lived presigned PUT URL for direct browser-to-S3 upload
 */
export async function generatePresignedPutUrl({ key, contentType, expiresIn = 3600 }) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return uploadUrl;
}

/**
 * Generate a short-lived presigned GET URL for secure video streaming/playback
 */
export async function generatePresignedGetUrl({ key, expiresIn = 900, contentType = 'video/mp4' }) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ResponseContentType: contentType,
    ResponseContentDisposition: 'inline',
  });

  const playbackUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return playbackUrl;
}

/**
 * Verify that an object exists in S3 and return its metadata
 */
export async function verifyS3Object({ key }) {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    const res = await s3Client.send(command);
    return {
      exists: true,
      contentLength: res.ContentLength,
      contentType: res.ContentType,
      etag: res.ETag,
      lastModified: res.LastModified,
    };
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw err;
  }
}

/**
 * Delete an object from S3
 */
export async function deleteS3Object({ key }) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
    return { success: true };
  } catch (err) {
    console.error('[S3 Delete Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Multipart upload initiation
 */
export async function initiateMultipart({ key, contentType }) {
  const command = new CreateMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const res = await s3Client.send(command);
  return { uploadId: res.UploadId, key };
}

/**
 * Generate presigned URL for a specific multipart part
 */
export async function generatePresignedPartUrl({ key, uploadId, partNumber, expiresIn = 3600 }) {
  const command = new UploadPartCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  const partUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return partUrl;
}

/**
 * Complete multipart upload
 */
export async function completeMultipart({ key, uploadId, parts }) {
  const sortedParts = [...parts]
    .map((p) => {
      const rawEtag = String(p.etag || p.ETag || '').trim();
      const cleanEtag = rawEtag.replace(/^"|"$/g, '');
      return {
        ETag: cleanEtag ? `"${cleanEtag}"` : rawEtag,
        PartNumber: Number(p.partNumber || p.PartNumber),
      };
    })
    .sort((a, b) => a.PartNumber - b.PartNumber);

  const command = new CompleteMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: sortedParts,
    },
  });
  const res = await s3Client.send(command);
  return { success: true, location: res.Location, etag: res.ETag };
}

/**
 * Abort multipart upload
 */
export async function abortMultipart({ key, uploadId }) {
  const command = new AbortMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
  });
  await s3Client.send(command);
  return { success: true };
}
