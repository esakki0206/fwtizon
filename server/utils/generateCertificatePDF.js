/**
 * generateCertificatePDF.js
 *
 * APPROACH: Image-Template + Text Overlay
 *   1. Draw the official FWT iZON certificate JPG as full-page background.
 *   2. White-out ONLY the placeholder areas.
 *   3. Overlay ONLY dynamic text fields on top.
 *
 * Nothing else is drawn — logos, borders, decorative lines, signatures,
 * bottom emblems all come from the template image unchanged.
 *
 * ── COORDINATES ──────────────────────────────────────────────────────────────
 * All X/Y values are in PDF points (A4 portrait: 595.28 × 841.89 pt).
 * They are calibrated to the calibrate_certificate.pdf grid overlay.
 * If text appears slightly off after a print test, adjust the constants
 * in the COORDS object below — no other code changes required.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const FONTS_DIR  = path.join(__dirname, '..', 'assets', 'fonts');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const TEMPLATE   = path.join(IMAGES_DIR, 'FWT iZON Certificate_page-0001.jpg');

// ── A4 Portrait dimensions ───────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;

// ── Colors ───────────────────────────────────────────────────────────────────
const COLOR_DARK  = '#1a1a1a';   // student name
const COLOR_NAVY  = '#1B2A4A';   // course name, footer labels
const COLOR_BODY  = '#333333';   // paragraph body text
const WHITE       = '#FFFFFF';   // whiteout fill

// ── Placeholder coordinate map ────────────────────────────────────────────────
// Each entry has:
//   wipe  – rectangle to erase the template placeholder text
//   text  – where to start drawing the replacement text
//
// READ FROM calibrate_certificate.pdf:
//   [TRAINEE FULL NAME] sits just below the y=250 grid line
//   [Course Name]       sits just below the y=300 grid line
//   Paragraph block     spans y=396 → y=578
//   DATE / CERT ID      sit in the y=770–800 band at bottom-right
//
const COORDS = {
  // ── 1. STUDENT NAME ─────────────────────────────────────────────────────
  // Large, bold, uppercase.  Centered between the two gold borders.
  NAME: {
    wipe: { x: 48,  y: 243, w: 500, h: 38 },   // generous height covers ascenders
    text: { x: 48,  y: 248, w: 500 },
  },

  // ── 2. COURSE NAME ──────────────────────────────────────────────────────
  // GreatVibes script font, centered.  Sits below the student name block.
  COURSE: {
    wipe: { x: 48,  y: 293, w: 500, h: 38 },
    text: { x: 48,  y: 297, w: 500 },
  },

  // ── 3. PARAGRAPH BLOCK ──────────────────────────────────────────────────
  // The entire achievement paragraph is whited-out and redrawn because
  // [Domain Name] and [Area of Expertise] appear INLINE within the text.
  // Font, size, line-gap and justify-alignment are matched to the template.
  PARA: {
    wipe: { x: 52,  y: 393, w: 492, h: 184 },  // covers full 8-line paragraph
    text: { x: 58,  y: 398, w: 480 },
    fontSize: 12.5,
    lineGap:  6,
  },

  // ── 4. DATE ─────────────────────────────────────────────────────────────
  // "DATE: 21 April 2026" — right-aligned at bottom.
  DATE: {
    wipe: { x: 338, y: 771, w: 210, h: 15 },
    text: { x: 48,  y: 774, w: 500 },
  },

  // ── 5. CERTIFICATE ID ───────────────────────────────────────────────────
  // "CERTIFICATE ID: FWT-IZON-2026-0001" — right-aligned below DATE.
  CERTID: {
    wipe: { x: 268, y: 787, w: 280, h: 15 },
    text: { x: 48,  y: 790, w: 500 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draw the template JPG as a full-page background.
 * width/height are set to the exact A4 PDF dimensions to avoid any distortion.
 */
function drawBackground(doc) {
  doc.save();
  doc.image(TEMPLATE, 0, 0, { width: PAGE_W, height: PAGE_H });
  doc.restore();
}

/**
 * White-out a rectangular area to erase the template placeholder text.
 * @param {PDFDocument} doc
 * @param {{x,y,w,h}} rect
 */
function whiteout(doc, { x, y, w, h }) {
  doc.save();
  doc.rect(x, y, w, h).fill(WHITE);
  doc.restore();
}

/**
 * Render text that auto-scales down if it would overflow the given width.
 * Decrements font size by 0.5pt steps from maxSize down to minSize.
 *
 * @param {PDFDocument} doc
 * @param {string}  text
 * @param {number}  x
 * @param {number}  y
 * @param {number}  width
 * @param {number}  maxSize    Starting (maximum) font size
 * @param {number}  minSize    Smallest acceptable font size
 * @param {number}  maxHeight  Maximum rendered height allowed (in pts)
 * @param {Object}  opts       Extra PDFKit text options
 */
function fitTextInBox(doc, text, x, y, width, maxSize, minSize, maxHeight, opts = {}) {
  let size = maxSize;
  while (size > minSize) {
    const h = doc.fontSize(size).heightOfString(text, { width, ...opts });
    if (h <= maxHeight) break;
    size -= 0.5;
  }
  doc.fontSize(size).text(text, x, y, { width, ...opts });
}

/**
 * Format a date as "21 April 2026" (certificate footer style).
 * @param {Date|string} date
 * @returns {string}
 */
function formatCertDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'long',
    year:  'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a Certificate of Completion PDF using the official FWT iZON template.
 * ONLY the five dynamic fields are overlaid; everything else comes from the image.
 *
 * @param {Object}        data
 * @param {string}        data.studentName       Trainee full name
 * @param {string}        data.courseName        Completed course name
 * @param {string}       [data.domain]           Domain (e.g. "Web Development")
 * @param {string}       [data.areaOfExpertise]  Area (e.g. "MERN Stack Engineering")
 * @param {Date|string}   data.completionDate    Date of completion
 * @param {string}        data.certificateId     Unique certificate ID
 * @param {number}       [data.serialNumber]     Sequential serial number (optional)
 * @returns {Promise<Buffer>}                    PDF as a Buffer
 */
export const generateCertificatePDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        studentName     = 'STUDENT NAME',
        courseName      = 'Course Name',
        domain          = 'Professional Development',
        areaOfExpertise = 'Specialized Training',
        completionDate  = new Date(),
        certificateId   = 'FWT-IZON-0000',
      } = data;

      // ── Document setup (A4 Portrait, zero margins) ──────────────────────
      const doc = new PDFDocument({
        size:   'A4',
        layout: 'portrait',
        margin: 0,
        info: {
          Title:    `Certificate of Completion – ${studentName}`,
          Author:   'FWT iZON',
          Subject:  'Certificate of Completion',
          Creator:  'FWT iZON Platform',
        },
      });

      const chunks = [];
      doc.on('data',  (c) => chunks.push(c));
      doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Register custom fonts ────────────────────────────────────────────
      doc.registerFont('GreatVibes',    path.join(FONTS_DIR, 'GreatVibes-Regular.ttf'));
      doc.registerFont('UncialAntiqua', path.join(FONTS_DIR, 'UncialAntiqua-Regular.ttf'));
      doc.registerFont('Roboto',        path.join(FONTS_DIR, 'Roboto.ttf'));
      doc.registerFont('RobotoItalic',  path.join(FONTS_DIR, 'Roboto-Italic.ttf'));

      // ════════════════════════════════════════════════════════════════════
      // STEP 1 – Full-page template background
      // ════════════════════════════════════════════════════════════════════
      drawBackground(doc);

      // ════════════════════════════════════════════════════════════════════
      // STEP 2 – [TRAINEE FULL NAME]
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.NAME.wipe);
      doc.fillColor(COLOR_DARK);
      fitTextInBox(
        doc,
        studentName.toUpperCase(),
        COORDS.NAME.text.x,
        COORDS.NAME.text.y,
        COORDS.NAME.text.w,
        /* maxSize */ 26,
        /* minSize */ 13,
        /* maxH    */ 34,
        { font: 'Helvetica-Bold', align: 'center' }
      );

      // ════════════════════════════════════════════════════════════════════
      // STEP 3 – [Course Name]
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.COURSE.wipe);
      doc.fillColor(COLOR_NAVY);
      fitTextInBox(
        doc,
        courseName,
        COORDS.COURSE.text.x,
        COORDS.COURSE.text.y,
        COORDS.COURSE.text.w,
        /* maxSize */ 24,
        /* minSize */ 12,
        /* maxH    */ 34,
        { font: 'GreatVibes', align: 'center' }
      );

      // ════════════════════════════════════════════════════════════════════
      // STEP 4 – Achievement paragraph  ([Domain Name] + [Area of Expertise])
      // The entire paragraph block is whited-out and redrawn with the real
      // domain/expertise values bolded inline, matching the template style.
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.PARA.wipe);

      const { text: pt, fontSize: pSz, lineGap: pLg } = COORDS.PARA;

      doc
        .fontSize(pSz)
        .fillColor(COLOR_BODY)
        .font('Helvetica')
        .text(
          'This achievement confirms that the candidate has attained'
          + ' professional-grade competency within the ',
          pt.x, pt.y,
          { width: pt.w, align: 'justify', lineGap: pLg, continued: true }
        )
        .font('Helvetica-Bold')
        .text(domain, { continued: true })
        .font('Helvetica')
        .text(
          ' domain. This certification validates the candidate as highly'
          + ' qualified in their area of expertise across ',
          { continued: true }
        )
        .font('Helvetica-Bold')
        .text(areaOfExpertise, { continued: true })
        .font('Helvetica')
        .text(
          '. By completing this program on the FWT iZON platform, the trainee'
          + ' has demonstrated mastery of industry-standard workflows through'
          + ' our proprietary Rise\u2013Launch\u2013Accelerate ecosystem.',
          { continued: false }
        );

      // ════════════════════════════════════════════════════════════════════
      // STEP 5 – [DATE]  (format: "21 April 2026")
      // ════════════════════════════════════════════════════════════════════
      const certDateStr = formatCertDate(completionDate);
      whiteout(doc, COORDS.DATE.wipe);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COLOR_NAVY)
        .text(
          `DATE: ${certDateStr}`,
          COORDS.DATE.text.x,
          COORDS.DATE.text.y,
          { width: COORDS.DATE.text.w, align: 'right' }
        );

      // ════════════════════════════════════════════════════════════════════
      // STEP 6 – Certificate ID
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.CERTID.wipe);
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(COLOR_NAVY)
        .text(
          `CERTIFICATE ID: ${certificateId}`,
          COORDS.CERTID.text.x,
          COORDS.CERTID.text.y,
          { width: COORDS.CERTID.text.w, align: 'right' }
        );

      // ── Finalize ─────────────────────────────────────────────────────────
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
