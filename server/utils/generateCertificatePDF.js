import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { wrapText, normalizeOverlay, validateOverlay } from '../lib/overlayRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const LEGACY_TEMPLATE = path.join(IMAGES_DIR, 'FWT iZON Certificate_page-0001.png');

// Legacy hardcoded positions (kept for backward compat when no template supplied)
const LEGACY_W = 2482;
const LEGACY_H = 3510;

const LEGACY_POS = {
  name: { x: 620, y: 1079, width: 1240, height: 180, wipe: { x: 660, y: 1080, width: 1160, height: 200 }, baselineAdjust: 1.5 },
  course: { x: 700, y: 1455, width: 1080, height: 160, wipe: { x: 820, y: 1465, width: 860, height: 180 }, baselineAdjust: 2 },
  date: { x: 2188, y: 3299, width: 143, height: 55, wipe: { x: 2192, y: 3293, width: 165, height: 56 }, baselineAdjust: 0.3 },
  slNo: { x: 2195, y: 3377, width: 151, height: 25, wipe: { x: 2194, y: 3371, width: 162, height: 57 }, baselineAdjust: 0.2 },
};

const LEGACY_WHITE = '#FFFFFF';
const LEGACY_DARK = '#111111';
const LEGACY_NAVY = '#1B2A4A';
const LEGACY_ORANGE = '#EA580C';

// All custom fonts bundled in /assets/fonts/ mapped to their alias names
const CUSTOM_FONTS = [
  { name: 'GreatVibes', file: 'GreatVibes-Regular.ttf' },
  { name: 'PlayfairDisplay', file: 'PlayfairDisplay.ttf' },
  { name: 'PlayfairDisplay-Italic', file: 'PlayfairDisplay-Italic.ttf' },
  { name: 'Roboto', file: 'Roboto.ttf' },
  { name: 'Roboto-Italic', file: 'Roboto-Italic.ttf' },
  { name: 'Inter', file: 'Inter.ttf' },
  { name: 'UncialAntiqua', file: 'UncialAntiqua-Regular.ttf' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date, format = 'DD/MM/YYYY') {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (format) {
    case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'DD MMM YYYY': return `${day} ${monthNames[d.getMonth()]} ${year}`;
    case 'MMMM DD, YYYY': return `${monthNames[d.getMonth()]} ${day}, ${year}`;
    default: return `${day}/${month}/${year}`;
  }
}

function fetchRemoteBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Remote fetch failed: ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function pctToPt(pct, totalPt) { return (pct / 100) * totalPt; }

function fitFontSize(doc, text, maxWidthPt, maxSize, minSize = 6) {
  let size = maxSize;
  while (size > minSize) {
    doc.fontSize(size);
    if (doc.widthOfString(text) <= maxWidthPt) break;
    size -= 0.5;
  }
  return size;
}

/**
 * Register all custom fonts on the given PDFDocument instance.
 * Each registration is individually wrapped so one missing file doesn't
 * abort the entire document creation.
 */
function registerCustomFonts(doc) {
  for (const { name, file } of CUSTOM_FONTS) {
    try {
      doc.registerFont(name, path.join(FONTS_DIR, file));
    } catch (err) {
      console.warn(`[generateCertificatePDF] Could not register font "${name}" (${file}):`, err.message);
    }
  }
}

// ─── Legacy Generator (original hardcoded template) ─────────────────────────

function legacyGenerate(doc, data) {
  const { studentName, courseName, completionDate, certificateId, serialNumber } = data;

  const PAGE_W = doc.page.width;
  const PAGE_H = doc.page.height;
  const SCALE_X = PAGE_W / LEGACY_W;
  const SCALE_Y = PAGE_H / LEGACY_H;

  const toPdfRect = ({ x, y, width, height }) => ({
    x: x * SCALE_X, y: y * SCALE_Y, width: width * SCALE_X, height: height * SCALE_Y,
  });

  const whiteout = (rect) => {
    const b = toPdfRect(rect);
    doc.save().rect(b.x, b.y, b.width, b.height).fill(LEGACY_WHITE).restore();
  };

  // Background
  doc.image(LEGACY_TEMPLATE, 0, 0, { width: PAGE_W, height: PAGE_H });

  // Student name
  whiteout(LEGACY_POS.name.wipe);
  const nameBox = toPdfRect(LEGACY_POS.name);
  doc.save().font('Helvetica-Bold');
  const nameFz = fitFontSize(doc, studentName.toUpperCase(), nameBox.width, 28, 18);
  doc.fontSize(nameFz).fillColor(LEGACY_DARK);
  const nameW = doc.widthOfString(studentName.toUpperCase());
  const nameH = doc.heightOfString(studentName.toUpperCase(), { lineBreak: false });
  doc.text(studentName.toUpperCase(), nameBox.x + (nameBox.width - nameW) / 2, nameBox.y + (nameBox.height - nameH) / 2 + LEGACY_POS.name.baselineAdjust, { lineBreak: false });
  doc.restore();

  // Course name
  whiteout(LEGACY_POS.course.wipe);
  const courseBox = toPdfRect(LEGACY_POS.course);
  doc.save().font('Helvetica-Bold');
  const courseFz = fitFontSize(doc, courseName, courseBox.width, 29, 12);
  doc.fontSize(courseFz).fillColor(LEGACY_ORANGE);
  const courseH = doc.heightOfString(courseName, { width: courseBox.width, align: 'center' });
  doc.text(courseName, courseBox.x, courseBox.y + (courseBox.height - courseH) / 2 + LEGACY_POS.course.baselineAdjust, { width: courseBox.width, align: 'center', lineBreak: true });
  doc.restore();

  // Date
  whiteout(LEGACY_POS.date.wipe);
  const dateBox = toPdfRect(LEGACY_POS.date);
  const dateStr = formatDate(completionDate);
  doc.save().font('Helvetica-Bold').fontSize(11).fillColor(LEGACY_NAVY);
  doc.text(dateStr, dateBox.x, dateBox.y + LEGACY_POS.date.baselineAdjust, { lineBreak: false });
  doc.restore();

  // Serial number
  whiteout(LEGACY_POS.slNo.wipe);
  const slBox = toPdfRect(LEGACY_POS.slNo);
  const serial = String(serialNumber || '').padStart(4, '0') || certificateId.split('-').pop();
  doc.save().font('Helvetica-Bold').fontSize(12).fillColor(LEGACY_NAVY);
  doc.text(serial, slBox.x, slBox.y + LEGACY_POS.slNo.baselineAdjust, { lineBreak: false });
  doc.restore();
}

// ─── Template-Driven Generator ───────────────────────────────────────────────

async function templateGenerate(doc, data, template, templateImageBuffer) {
  const PAGE_W = doc.page.width;
  const PAGE_H = doc.page.height;

  // Draw template background
  doc.image(templateImageBuffer, 0, 0, { width: PAGE_W, height: PAGE_H });

  const {
    studentName = '',
    courseName = '',
    completionDate = new Date(),
    certificateId = '',
    serialNumber,
    instructorName = '',
  } = data;

  for (const overlay of (template.overlays || [])) {
    // Skip if not visible (NEW field)
    if (overlay.visible === false) continue;

    // Convert % positions to absolute PDF points
    const xPt = pctToPt(overlay.x, PAGE_W);
    const yPt = pctToPt(overlay.y, PAGE_H);
    const maxWidPt = pctToPt(overlay.maxWidth || 60, PAGE_W);

    // Resolve text value
    let text = '';
    switch (overlay.field) {
      case 'studentName': text = studentName; break;
      case 'courseName': text = courseName; break;
      case 'date': text = formatDate(completionDate, overlay.dateFormat); break;
      case 'certificateId': text = certificateId; break;
      case 'serialNumber': text = String(serialNumber || '').padStart(4, '0'); break;
      case 'instructorName': text = instructorName; break;
      case 'customText': text = overlay.customText || ''; break;
      default: text = '';
    }

    if (overlay.field === 'wipe') {
      doc.save();
      const rectH = pctToPt(overlay.height || 5, PAGE_H);
      const rectW = maxWidPt;

      if (overlay.rotation && overlay.rotation !== 0) {
        doc.translate(xPt, yPt);
        doc.rotate(overlay.rotation);
        doc.translate(-xPt, -yPt);
      }

      doc.opacity(overlay.opacity ?? 1)
        .rect(xPt - rectW / 2, yPt - rectH / 2, rectW, rectH)
        .fill(overlay.color || '#FFFFFF');

      doc.restore();
      continue;
    }

    if (!text) continue;
    if (overlay.uppercase) text = text.toUpperCase();

    doc.save();

    // Try requested font, fall back to Helvetica-Bold on error
    const requestedFont = overlay.fontFamily || 'Helvetica-Bold';
    try { doc.font(requestedFont); }
    catch { doc.font('Helvetica-Bold'); }

    const fz = fitFontSize(doc, text, maxWidPt, overlay.fontSize || 24);

    // Apply new styling properties (NEW)
    doc.fontSize(fz)
      .fillColor(overlay.color || '#000000')
      .font(requestedFont, overlay.fontWeight === 'bold' ? 'bold' : 'normal');

    // Apply opacity (NEW)
    if (overlay.opacity !== undefined && overlay.opacity < 1) {
      doc.opacity(overlay.opacity);
    }

    // Wrap text using shared utility
    const lines = wrapText(text, fz, maxWidPt, doc);

    // Apply rotation if needed (NEW)
    if (overlay.rotation && overlay.rotation !== 0) {
      doc.save();
      doc.translate(xPt, yPt);
      doc.rotate(overlay.rotation);
      doc.translate(-xPt, -yPt);
    }

    // Apply letter spacing if available (NEW, pdfkit native support)
    const baseLineHeight = overlay.lineHeight || 1.2;
    const lineSpacing = fz * baseLineHeight;

    // Calculate alignment offset
    let drawX = xPt;
    const textW = doc.widthOfString(text);
    if (overlay.align === 'center') drawX = xPt - textW / 2;
    else if (overlay.align === 'right') drawX = xPt - textW;

    // Draw lines with line-height spacing
    lines.forEach((line, idx) => {
      const yOffset = yPt + (idx * lineSpacing);
      doc.text(line, drawX, yOffset, { width: maxWidPt, align: overlay.align || 'left', lineBreak: false });
    });

    if (overlay.rotation && overlay.rotation !== 0) {
      doc.restore();
    }

    doc.restore();
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Generate a certificate PDF.
 *
 * @param {Object} data           – { studentName, courseName, completionDate, certificateId, serialNumber, instructorName }
 * @param {Object|null} template  – CertificateTemplate document (optional). If omitted, legacy hardcoded template is used.
 * @returns {Promise<Buffer>}     – PDF buffer
 */
export const generateCertificatePDF = async (data, template = null) => {
  const orientation = template?.orientation || 'portrait';

  const doc = new PDFDocument({
    size: 'A4',
    layout: orientation,
    margin: 0,
    info: {
      Title: `Certificate - ${data.studentName || 'Student'}`,
      Author: 'FWT iZON',
      Subject: 'Certificate',
      Creator: 'FWT iZON Platform',
    },
  });

  // Register all bundled custom fonts so overlay fontFamily choices work
  registerCustomFonts(doc);

  const chunks = [];
  const pdfPromise = new Promise((resolve, reject) => {
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  if (template && template.fileUrl) {
    // Template-driven path
    let templateImageBuffer;
    try {
      templateImageBuffer = await fetchRemoteBuffer(template.fileUrl);
    } catch (fetchErr) {
      console.error('[generateCertificatePDF] Failed to fetch template image, falling back to legacy:', fetchErr.message);
      legacyGenerate(doc, data);
      doc.end();
      return pdfPromise;
    }
    await templateGenerate(doc, data, template, templateImageBuffer);
  } else {
    // Legacy hardcoded path
    legacyGenerate(doc, data);
  }

  doc.end();
  return pdfPromise;
};
