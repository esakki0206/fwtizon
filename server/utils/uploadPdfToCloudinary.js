import { v2 as cloudinary } from 'cloudinary';

// Cloudinary is already configured in server.js or config, but we can ensure it here
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Uploads a raw PDF buffer to Cloudinary and returns the secure URL
 * @param {Buffer} buffer - The PDF buffer
 * @param {String} filename - Desired filename
 * @param {String} folder - Target folder inside Cloudinary (e.g. 'fwtion/certificates')
 * @returns {Promise<String>} The secure URL of the uploaded PDF
 */
export const uploadPdfToCloudinary = (buffer, filename, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: 'image', // MUST be image for Cloudinary to serve PDF as viewable/interactive
        format: 'pdf',
        upload_preset: 'fwtiZON',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary PDF upload error:', error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    // End the stream with the buffer
    uploadStream.end(buffer);
  });
};
