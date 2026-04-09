import { useState, useRef, useCallback } from 'react';
import { FiUploadCloud, FiX, FiRefreshCw, FiCheck, FiImage } from 'react-icons/fi';
import imageCompression from 'browser-image-compression';
import axios from 'axios';

/**
 * Reusable image upload component with compression, preview, progress, and retry.
 * @param {Object} props
 * @param {function} props.onUploadComplete - Callback with the uploaded URL
 * @param {string} props.currentImage - Current image URL (for preview)
 * @param {string} props.label - Label text
 * @param {string} props.className - Additional wrapper className
 */
const ImageUploader = ({ onUploadComplete, currentImage = '', label = 'Upload Image', className = '' }) => {
  const [preview, setPreview] = useState(currentImage);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const lastFileRef = useRef(null);

  const MAX_SIZE_MB = 10;
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload a JPG, PNG, or WebP image';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File size exceeds ${MAX_SIZE_MB}MB limit`;
    }
    return null;
  };

  const compressAndUpload = async (file) => {
    setError('');
    setSuccess(false);
    setUploading(true);
    setProgress(0);

    try {
      // Compress image client-side
      setProgress(10);
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      });

      setProgress(30);

      // Create form data
      const formData = new FormData();
      formData.append('file', compressedFile, file.name);

      // Upload with progress tracking
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / (e.total || 1)) * 60) + 30;
          setProgress(Math.min(pct, 90));
        },
      });

      setProgress(100);
      setSuccess(true);

      if (res.data?.url) {
        setPreview(res.data.url);
        onUploadComplete?.(res.data.url);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      lastFileRef.current = file;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    lastFileRef.current = file;
    compressAndUpload(file);
  }, [onUploadComplete]);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRetry = () => {
    if (lastFileRef.current) {
      compressAndUpload(lastFileRef.current);
    }
  };

  const handleRemove = () => {
    setPreview('');
    setError('');
    setSuccess(false);
    setProgress(0);
    onUploadComplete?.('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200
          ${dragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
          }
          ${uploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
        />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-40 object-cover rounded-lg"
            />
            {!uploading && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
              >
                <FiX size={14} />
              </button>
            )}
            {success && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg shadow">
                <FiCheck size={12} /> Uploaded
              </div>
            )}
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              <FiImage className="text-primary-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {dragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP • Max {MAX_SIZE_MB}MB</p>
          </div>
        )}

        {/* Progress bar */}
        {uploading && (
          <div className="mt-3 space-y-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
              <FiUploadCloud size={12} className="animate-pulse" />
              {progress < 30 ? 'Compressing...' : progress < 90 ? 'Uploading...' : 'Finalizing...'}
              {progress}%
            </p>
          </div>
        )}
      </div>

      {/* Error + Retry */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-medium px-3 py-2 rounded-lg">
          <span>{error}</span>
          {lastFileRef.current && (
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1 text-red-500 hover:text-red-700 transition"
            >
              <FiRefreshCw size={12} /> Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
