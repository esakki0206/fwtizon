/**
 * Input validation and sanitization utilities for certificate templates.
 * Prevents XSS, overflow, and invalid data.
 */

/**
 * Sanitize custom text for overlays.
 * - Removes dangerous characters
 * - Limits length
 * - Trims whitespace
 *
 * @param {string} text - Input text
 * @param {number} maxLength - Maximum length (default 500)
 * @returns {string} - Sanitized text
 */
export const sanitizeCustomText = (text) => {
  if (typeof text !== 'string') return '';
  
  return text
    .slice(0, 500)                    // Limit length
    .replace(/[<>\"'`]/g, '')         // Remove dangerous chars
    .replace(/\n\n+/g, '\n')          // Collapse multiple newlines
    .trim();
};

/**
 * Sanitize PDF filename.
 * - Removes special characters
 * - Limits length
 * - Ensures valid filename
 *
 * @param {string} filename - Input filename
 * @param {string} fallback - Fallback if empty
 * @returns {string} - Safe filename
 */
export const sanitizePdfFilename = (filename, fallback = 'certificate') => {
  const safe = String(filename || fallback || 'certificate')
    .replace(/[^a-zA-Z0-9._\-]/g, '-')  // Keep only safe chars
    .replace(/-+/g, '-')                 // Collapse multiple dashes
    .replace(/^-|-$/g, '')               // Remove leading/trailing dashes
    .slice(0, 100);                      // Limit length

  return safe || fallback || 'certificate';
};

/**
 * Validate color hex string.
 *
 * @param {string} color - Color string (#RRGGBB or rgb())
 * @returns {boolean} - True if valid
 */
export const isValidColor = (color) => {
  if (!color || typeof color !== 'string') return false;

  // Hex color
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return true;

  // RGB color
  if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color)) return true;

  return false;
};

/**
 * Normalize hex color to lowercase.
 *
 * @param {string} color - Color string
 * @returns {string} - Normalized color
 */
export const normalizeColor = (color) => {
  if (!color) return '#000000';
  
  const hex = String(color).match(/^#[0-9A-Fa-f]{6}$/);
  return hex ? color.toLowerCase() : '#000000';
};

/**
 * Validate font family against whitelist.
 *
 * @param {string} fontFamily - Font name
 * @returns {boolean} - True if valid
 */
export const isValidFont = (fontFamily) => {
  const validFonts = [
    'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
    'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
    'Courier', 'Courier-Bold',
    'GreatVibes', 'PlayfairDisplay', 'PlayfairDisplay-Italic',
    'Roboto', 'Roboto-Italic', 'Inter', 'UncialAntiqua',
  ];
  return validFonts.includes(fontFamily);
};

/**
 * Normalize font family to valid value.
 *
 * @param {string} fontFamily - Font name
 * @returns {string} - Valid font or default
 */
export const normalizeFontFamily = (fontFamily) => {
  return isValidFont(fontFamily) ? fontFamily : 'Helvetica-Bold';
};

/**
 * Validate alignment.
 *
 * @param {string} align - Alignment value
 * @returns {boolean} - True if valid
 */
export const isValidAlign = (align) => {
  return ['left', 'center', 'right'].includes(align);
};

/**
 * Normalize alignment to valid value.
 *
 * @param {string} align - Alignment value
 * @returns {string} - Valid alignment
 */
export const normalizeAlign = (align) => {
  return isValidAlign(align) ? align : 'center';
};

/**
 * Validate field type.
 *
 * @param {string} field - Field type
 * @returns {boolean} - True if valid
 */
export const isValidField = (field) => {
  const validFields = [
    'studentName', 'courseName', 'date', 'certificateId',
    'serialNumber', 'instructorName', 'customText', 'wipe',
  ];
  return validFields.includes(field);
};

/**
 * Validate date format.
 *
 * @param {string} format - Date format string
 * @returns {boolean} - True if valid
 */
export const isValidDateFormat = (format) => {
  const validFormats = [
    'DD/MM/YYYY', 'DD-MM-YYYY', 'MM/DD/YYYY',
    'YYYY/MM/DD', 'YYYY-MM-DD',
    'DD MMM YYYY', 'DD MMMM YYYY',
    'DD/MMM/YY', 'DD/MMMM/YY',
    'MMMM DD, YYYY',
  ];
  return validFormats.includes(format);
};

/**
 * Normalize date format to valid value.
 *
 * @param {string} format - Date format
 * @returns {string} - Valid format or default
 */
export const normalizeDateFormat = (format) => {
  return isValidDateFormat(format) ? format : 'DD/MM/YYYY';
};

/**
 * Sanitize and validate overlay configuration.
 * Modifies object in-place with safe values.
 *
 * @param {object} overlay - Overlay config
 * @returns {object} - Same overlay with sanitized values
 */
export const sanitizeOverlay = (overlay) => {
  if (!overlay || typeof overlay !== 'object') return null;

  // Numeric constraints
  overlay.x = Math.max(0, Math.min(100, Number(overlay.x) || 50));
  overlay.y = Math.max(0, Math.min(100, Number(overlay.y) || 50));
  overlay.fontSize = Math.max(6, Math.min(120, Number(overlay.fontSize) || 24));
  overlay.maxWidth = Math.max(overlay.field === 'wipe' ? 0.1 : 5, Math.min(100, Number(overlay.maxWidth) || 60));
  overlay.height = Math.max(0.1, Math.min(100, Number(overlay.height) || 5));
  overlay.rotation = Math.max(0, Math.min(360, Number(overlay.rotation) || 0));
  overlay.opacity = Math.max(0, Math.min(1, Number(overlay.opacity) ?? 1));
  overlay.letterSpacing = Number(overlay.letterSpacing) || 0;
  overlay.lineHeight = Math.max(0.5, Math.min(3, Number(overlay.lineHeight) || 1.2));

  // Enum constraints
  overlay.field = isValidField(overlay.field) ? overlay.field : 'customText';
  overlay.fontFamily = normalizeFontFamily(overlay.fontFamily);
  overlay.align = normalizeAlign(overlay.align);
  overlay.color = normalizeColor(overlay.color);
  overlay.fontWeight = ['normal', 'bold'].includes(overlay.fontWeight) ? overlay.fontWeight : 'normal';

  // Boolean constraints
  overlay.uppercase = Boolean(overlay.uppercase);
  overlay.visible = overlay.visible !== false;

  // Text constraints
  if (overlay.field === 'customText') {
    overlay.customText = sanitizeCustomText(overlay.customText);
  }
  if (overlay.field === 'date') {
    overlay.dateFormat = normalizeDateFormat(overlay.dateFormat);
  }

  // Ensure id
  if (!overlay.id) {
    overlay.id = `ov_${Date.now()}_${Math.random().toString(36).slice(9)}`;
  }

  return overlay;
};

/**
 * Sanitize all overlays in template.
 *
 * @param {array} overlays - Array of overlay configs
 * @returns {array} - Sanitized overlays
 */
export const sanitizeOverlays = (overlays) => {
  if (!Array.isArray(overlays)) return [];
  
  return overlays
    .map(o => sanitizeOverlay(o))
    .filter(o => o !== null);
};

/**
 * Validate template name.
 *
 * @param {string} name - Template name
 * @returns {boolean} - True if valid
 */
export const isValidTemplateName = (name) => {
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 255;
};

/**
 * Normalize numeric range value.
 *
 * @param {number} value - Input value
 * @param {number} min - Minimum allowed
 * @param {number} max - Maximum allowed
 * @param {number} defaultVal - Default if invalid
 * @returns {number} - Constrained value
 */
export const constrainNumber = (value, min, max, defaultVal = min) => {
  const num = Number(value);
  if (isNaN(num)) return defaultVal;
  return Math.max(min, Math.min(max, num));
};

/**
 * Validate a single overlay.
 *
 * @param {object} overlay - Overlay to validate
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export const validateOverlay = (overlay) => {
  const errors = [];

  if (!overlay || typeof overlay !== 'object') {
    errors.push('Overlay must be an object');
    return { isValid: false, errors };
  }

  // Validate required fields
  if (!overlay.field || !isValidField(overlay.field)) {
    errors.push(`Invalid field: "${overlay.field}"`);
  }

  // Validate numeric ranges
  if (typeof overlay.x !== 'number' || overlay.x < 0 || overlay.x > 100) {
    errors.push(`Invalid x position: ${overlay.x} (must be 0-100)`);
  }

  if (typeof overlay.y !== 'number' || overlay.y < 0 || overlay.y > 100) {
    errors.push(`Invalid y position: ${overlay.y} (must be 0-100)`);
  }

  if (typeof overlay.fontSize !== 'number' || overlay.fontSize < 6 || overlay.fontSize > 120) {
    errors.push(`Invalid fontSize: ${overlay.fontSize} (must be 6-120)`);
  }

  if (overlay.maxWidth && (typeof overlay.maxWidth !== 'number' || overlay.maxWidth < 0.1 || overlay.maxWidth > 100)) {
    errors.push(`Invalid maxWidth: ${overlay.maxWidth} (must be 0.1-100)`);
  }

  if (overlay.height && (typeof overlay.height !== 'number' || overlay.height < 0.1 || overlay.height > 100)) {
    errors.push(`Invalid height: ${overlay.height} (must be 0.1-100)`);
  }

  // Validate enum fields
  if (overlay.fontFamily && !isValidFont(overlay.fontFamily)) {
    errors.push(`Invalid fontFamily: "${overlay.fontFamily}"`);
  }

  if (overlay.align && !isValidAlign(overlay.align)) {
    errors.push(`Invalid align: "${overlay.align}"`);
  }

  if (overlay.dateFormat && !isValidDateFormat(overlay.dateFormat)) {
    errors.push(`Invalid dateFormat: "${overlay.dateFormat}"`);
  }

  // Validate color
  if (overlay.color && !isValidColor(overlay.color)) {
    errors.push(`Invalid color: "${overlay.color}"`);
  }

  // Validate new optional fields
  if (overlay.fontWeight && !['normal', 'bold'].includes(overlay.fontWeight)) {
    errors.push(`Invalid fontWeight: "${overlay.fontWeight}" (must be "normal" or "bold")`);
  }

  if (typeof overlay.letterSpacing === 'number' && (overlay.letterSpacing < -5 || overlay.letterSpacing > 10)) {
    errors.push(`Invalid letterSpacing: ${overlay.letterSpacing} (must be -5 to 10)`);
  }

  if (typeof overlay.lineHeight === 'number' && (overlay.lineHeight < 0.5 || overlay.lineHeight > 3)) {
    errors.push(`Invalid lineHeight: ${overlay.lineHeight} (must be 0.5-3)`);
  }

  if (typeof overlay.rotation === 'number' && (overlay.rotation < 0 || overlay.rotation > 360)) {
    errors.push(`Invalid rotation: ${overlay.rotation} (must be 0-360)`);
  }

  if (typeof overlay.opacity === 'number' && (overlay.opacity < 0 || overlay.opacity > 1)) {
    errors.push(`Invalid opacity: ${overlay.opacity} (must be 0-1)`);
  }

  if (typeof overlay.visible !== 'undefined' && typeof overlay.visible !== 'boolean') {
    errors.push(`Invalid visible: must be boolean`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate multiple overlays.
 *
 * @param {array} overlays - Array of overlays to validate
 * @returns {object} - { isValid: boolean, errors: object[] }
 */
export const validateOverlays = (overlays) => {
  if (!Array.isArray(overlays)) {
    return {
      isValid: false,
      errors: [{ index: -1, message: 'Overlays must be an array' }]
    };
  }

  const errors = [];

  overlays.forEach((overlay, index) => {
    const result = validateOverlay(overlay);
    if (!result.isValid) {
      errors.push({
        index,
        message: `Overlay ${index} invalid`,
        details: result.errors
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};
