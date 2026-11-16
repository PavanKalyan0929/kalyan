import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.ts';

const DOCUMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

function createPrivateUploader(
  subfolder: 'verification' | 'grievances' | 'college-photos' | 'college-logos' | 'posters' | 'student-photos',
  imagesOnly = false
) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(config.uploadDir, subfolder));
    },
    filename: (_req, file, cb) => {
      const ext = EXTENSION_BY_MIME[file.mimetype] || '';
      const randomName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
      cb(null, randomName);
    },
  });

  return multer({
    storage,
    limits: { fileSize: config.maxUploadBytes, files: 3 },
    fileFilter: (_req, file, cb) => {
      const allowed = imagesOnly ? IMAGE_MIME_TYPES : DOCUMENT_MIME_TYPES;
      if (!allowed.has(file.mimetype)) {
        cb(
          new Error(
            imagesOnly
              ? 'Only JPEG, PNG, or WebP images are permitted.'
              : 'Only JPEG, PNG, WebP images or PDF documents (max 5 MB) are permitted.'
          )
        );
        return;
      }
      cb(null, true);
    },
  });
}

export const verificationUpload = createPrivateUploader('verification', false);
export const grievanceUpload = createPrivateUploader('grievances', false);
export const collegePhotoUpload = createPrivateUploader('college-photos', true);
export const collegeLogoUpload = createPrivateUploader('college-logos', true);
export const posterImageUpload = createPrivateUploader('posters', true);
export const studentPhotoUpload = createPrivateUploader('student-photos', true);
