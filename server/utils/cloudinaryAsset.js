import { cloudinary } from '../config/cloudinary.js';

const UPLOAD_SEGMENT = '/upload/';

export const extractCloudinaryPublicId = (assetUrl) => {
  if (!assetUrl) return null;

  try {
    const { pathname } = new URL(assetUrl);
    const uploadIndex = pathname.indexOf(UPLOAD_SEGMENT);

    if (uploadIndex === -1) {
      return null;
    }

    let publicPath = pathname.slice(uploadIndex + UPLOAD_SEGMENT.length);
    publicPath = publicPath.replace(/^v\d+\//, '');

    if (!publicPath) {
      return null;
    }

    return publicPath.replace(/\.[^/.]+$/, '');
  } catch (_error) {
    return null;
  }
};

export const getSignedCloudinaryPdfUrl = (assetUrl, options = {}) => {
  const publicId = extractCloudinaryPublicId(assetUrl);

  if (!publicId) {
    throw new Error('Invalid Cloudinary PDF URL');
  }

  return cloudinary.utils.private_download_url(publicId, 'pdf', {
    resource_type: 'image',
    type: 'upload',
    ...options,
  });
};
