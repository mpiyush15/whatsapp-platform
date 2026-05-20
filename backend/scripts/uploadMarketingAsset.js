#!/usr/bin/env node
/**
 * Upload a marketing asset to S3 (public-read when bucket policy allows).
 * Usage: node scripts/uploadMarketingAsset.js <localPath> [s3Key]
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const localPath = process.argv[2];
const s3Key =
  process.argv[3] || `marketing/replysys-dashboard-hero-${Date.now()}.png`;

if (!localPath || !fs.existsSync(localPath)) {
  console.error('Usage: node scripts/uploadMarketingAsset.js <localPath> [s3Key]');
  process.exit(1);
}

const region = process.env.AWS_REGION || 'ap-south-1';
const bucket = process.env.S3_BUCKET_NAME || 'pixels-official';

const client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const buffer = fs.readFileSync(localPath);
const ext = path.extname(localPath).toLowerCase();
const contentType =
  ext === '.png'
    ? 'image/png'
    : ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : ext === '.svg'
        ? 'image/svg+xml'
        : 'application/octet-stream';

try {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      ACL: 'public-read',
    })
  );
} catch (err) {
  if (err.name === 'AccessControlListNotSupported' || err.Code === 'AccessDenied') {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    console.warn('ACL public-read not allowed; uploaded without ACL.');
  } else {
    throw err;
  }
}

const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;
console.log(JSON.stringify({ s3Key, bucket, region, publicUrl }, null, 2));
