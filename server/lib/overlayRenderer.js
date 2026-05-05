/**
 * Shared overlay rendering utilities used by both:
 * - Frontend: HTML5 Canvas preview
 * - Backend: PDF generation
 *
 * Ensures pixel-perfect consistency between editor preview and final PDF.
 */

/**
 * Wrap text to fit within a maximum width.
 * Used by both canvas and PDF rendering.
 *
 * @param {string} text - Text to wrap
 * @param {number} fontSize - Font size in pt/px
 * @param {number} maxWidth - Maximum width in px
 * @param {object} context - Canvas context or PDF context (must have widthOfString)
 * @returns {string[]} - Array of wrapped lines
 */
export const wrapText = (text, fontSize, maxWidth, context) => {
  if (!text || !maxWidth || maxWidth <= 0) return [text || ''];

  // For canvas context, estimate character width
  if (context && context.measureText) {
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = context.measureText(testLine).width;

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // For PDF context with widthOfString method, use it
  if (context && context.widthOfString) {
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = context.widthOfString(testLine);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Fallback: simple split
  return [text];
};

/**
 * Convert percentage position to absolute pixels.
 *
 * @param {number} percent - Percentage (0-100)
 * @param {number} total - Total dimension (width or height in px)
 * @returns {number} - Absolute pixel position
 */
export const percentToPx = (percent, total) => (percent / 100) * total;

/**
 * Normalize overlay coordinates and scale for rendering.
 *
 * @param {object} overlay - Overlay config
 * @param {number} containerWidth - Container width in px
 * @param {number} containerHeight - Container height in px
 * @param {number} scale - Scale factor (1.0 = 100%, 1.5 = 150%, etc.)
 * @returns {object} - Normalized overlay with absolute positions
 */
export const normalizeOverlay = (overlay, containerWidth, containerHeight, scale = 1) => {
  if (!overlay.visible) return null;

  return {
    ...overlay,
    // Convert % to absolute px
    x: percentToPx(overlay.x, containerWidth),
    y: percentToPx(overlay.y, containerHeight),
    maxWidthPx: percentToPx(overlay.maxWidth, containerWidth),

    // Apply scale
    scaledFontSize: overlay.fontSize * scale,
    scaledLetterSpacing: overlay.letterSpacing * scale,
    scaledLineHeight: overlay.lineHeight,

    // Keep properties for rendering
    fontWeight: overlay.fontWeight || 'normal',
    rotation: overlay.rotation || 0,
    opacity: overlay.opacity ?? 1,
  };
};

/**
 * Render overlay text on canvas context.
 * Used by frontend preview.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {object} overlay - Normalized overlay (from normalizeOverlay)
 * @param {string} text - Text to render (already resolved from data)
 */
export const renderOnCanvas = (ctx, overlay, text) => {
  if (!overlay || !text) return;

  ctx.save();

  // Set text properties
  const fontStyle = `${overlay.fontWeight} ${overlay.scaledFontSize}px ${overlay.fontFamily}`;
  ctx.font = fontStyle;
  ctx.fillStyle = overlay.color || '#000000';
  ctx.globalAlpha = overlay.opacity ?? 1;
  ctx.textAlign = overlay.align || 'left';

  // Wrap text
  const lines = wrapText(text, overlay.scaledFontSize, overlay.maxWidthPx, ctx);

  // Apply rotation if needed
  if (overlay.rotation && overlay.rotation !== 0) {
    ctx.translate(overlay.x, overlay.y);
    ctx.rotate((overlay.rotation * Math.PI) / 180);
    ctx.translate(-overlay.x, -overlay.y);
  }

  // Draw text with line-height spacing
  const lineSpacing = overlay.scaledFontSize * overlay.scaledLineHeight;
  lines.forEach((line, idx) => {
    const yOffset = overlay.y + idx * lineSpacing;
    ctx.fillText(line, overlay.x, yOffset);
  });

  ctx.restore();
};

/**
 * Calculate text bounds for overlay.
 * Used for validation and debugging.
 *
 * @param {object} overlay - Normalized overlay
 * @param {string} text - Text to measure
 * @param {CanvasRenderingContext2D} ctx - Canvas context for measurement
 * @returns {object} - Bounds {x, y, width, height}
 */
export const getTextBounds = (overlay, text, ctx) => {
  if (!ctx || !text) return null;

  const lines = wrapText(text, overlay.scaledFontSize, overlay.maxWidthPx, ctx);
  ctx.font = `${overlay.fontWeight} ${overlay.scaledFontSize}px ${overlay.fontFamily}`;

  let maxWidth = 0;
  lines.forEach((line) => {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  });

  const height = lines.length * overlay.scaledFontSize * overlay.scaledLineHeight;

  return {
    x: overlay.x,
    y: overlay.y,
    width: maxWidth,
    height,
  };
};

/**
 * Validate overlay configuration.
 *
 * @param {object} overlay - Overlay to validate
 * @returns {string[]} - Array of error messages (empty if valid)
 */
export const validateOverlay = (overlay) => {
  const errors = [];

  if (!overlay.field) errors.push('Field is required');
  if (overlay.x === undefined || overlay.x < 0 || overlay.x > 100) {
    errors.push('X position must be 0-100%');
  }
  if (overlay.y === undefined || overlay.y < 0 || overlay.y > 100) {
    errors.push('Y position must be 0-100%');
  }
  if (!overlay.fontSize || overlay.fontSize < 6 || overlay.fontSize > 120) {
    errors.push('Font size must be 6-120pt');
  }
  if (!overlay.maxWidth || overlay.maxWidth < 5 || overlay.maxWidth > 100) {
    errors.push('Max width must be 5-100%');
  }
  if (overlay.rotation !== undefined && (overlay.rotation < 0 || overlay.rotation > 360)) {
    errors.push('Rotation must be 0-360 degrees');
  }
  if (overlay.opacity !== undefined && (overlay.opacity < 0 || overlay.opacity > 1)) {
    errors.push('Opacity must be 0-1');
  }
  if (overlay.lineHeight !== undefined && (overlay.lineHeight < 0.5 || overlay.lineHeight > 3)) {
    errors.push('Line height must be 0.5-3x');
  }

  return errors;
};

/**
 * Validate all overlays in a template.
 *
 * @param {array} overlays - Array of overlay configs
 * @returns {object} - Validation result {isValid, errors{overlayId: [errors]}}
 */
export const validateOverlays = (overlays) => {
  const errors = {};
  let isValid = true;

  if (!Array.isArray(overlays)) {
    return { isValid: false, errors: { _global: ['Overlays must be an array'] } };
  }

  overlays.forEach((overlay) => {
    const overlayErrors = validateOverlay(overlay);
    if (overlayErrors.length > 0) {
      errors[overlay.id || `overlay_${overlays.indexOf(overlay)}`] = overlayErrors;
      isValid = false;
    }
  });

  return { isValid, errors };
};

/**
 * Get default values for new overlay fields.
 *
 * @returns {object} - Default overlay values
 */
export const getDefaultOverlay = () => ({
  id: `ov_${Date.now()}_${Math.random().toString(36).slice(9)}`,
  field: 'studentName',
  label: '',
  customText: '',
  x: 50,
  y: 50,
  fontSize: 24,
  fontWeight: 'normal',
  letterSpacing: 0,
  lineHeight: 1.2,
  fontFamily: 'Helvetica-Bold',
  color: '#000000',
  align: 'center',
  maxWidth: 60,
  uppercase: false,
  rotation: 0,
  opacity: 1,
  visible: true,
  dateFormat: 'DD/MM/YYYY',
});
