import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Optimized storage for thumbnails & images.
 * Auto quality, auto format, max 1200px width.
 */
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'fwtion_lms/images',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
    ],
  },
});

/**
 * General file storage for documents, videos, and assignment files.
 * No image transformation applied.
 */
const fileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'fwtion_lms/files',
    allowed_formats: ['jpg', 'png', 'jpeg', 'mp4', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip'],
    resource_type: 'auto',
  },
});

/**
 * File size limit filter (10MB).
 */
const fileSizeFilter = (req, file, cb) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    cb(new Error('File size exceeds 10MB limit'), false);
  } else {
    cb(null, true);
  }
};

export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: fileSizeFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const upload = multer({
  storage: fileStorage,
  fileFilter: fileSizeFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export { cloudinary };
