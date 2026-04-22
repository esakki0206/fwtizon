/**
 * generateReceiptPDF.js
 *
 * APPROACH: Image-Template + Text Overlay
 *   1. Draw the official FWT iZON receipt JPG as full-page background.
 *   2. White-out ONLY the placeholder cell interiors (1 pt inset from borders).
 *   3. Overlay ONLY dynamic text fields on top.
 *
 * Nothing else is drawn — logos, company info, table borders, column headers,
 * "RECEIPT" heading, "AMOUNT RECEIVED" section title all come from the image.
 *
 * ── KEY DYNAMIC FIELDS OVERLAID ─────────────────────────────────────────────
 *   [Sl No]            → serialNumber  (builds "FWT-iZON-RECEIPT-YYYY/YY-XX")
 *   [DATE]             → date          (format: DD/MM/YYYY)
 *   [NAME]             → userName
 *   <COURSE NAME>      → courseName
 *   <AMOUNT>           → amount
 *   <Total Amount>     → amount (formatted)
 *   <TOTAL AMOUNT IN WORDS> → amountToWords(amount)
 *
 * ── COORDINATES ──────────────────────────────────────────────────────────────
 * All X/Y values are in PDF points (A4 portrait: 595.28 × 841.89 pt).
 * Calibrated from calibrate_receipt.pdf grid overlay.
 * Adjust constants in COORDS if text appears off after a visual test.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { amountToWords } from './numberToWords.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const TEMPLATE   = path.join(IMAGES_DIR, 'FWT iZON Receipt_page-0001.jpg');

// ── A4 Portrait dimensions ───────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;

// ── Layout constants (match original generator that created the template) ────
// MARGIN = 35pt, content width ≈ 525pt
// Receipt info table column widths: label=85, value=210, "Date:" label=45, date value=185
// Items table: Sl.No.=60, Particulars=310, Amount=155
// Amount section: label=105, value=215
//
// The template header is ~22pt taller than a pure-code render, so every y
// value below has a +22pt offset applied over the original generator positions.
// Original positions → +22 offset → template-aligned positions.

const MARGIN   = 35;
const ROW_H    = 22;   // standard row height (pt)
const ITEM_H   = 80;   // tall item row height (pt)
const AMT_ROW_H = 24;  // amount section row height (pt)

// Derived y positions (original code base + 22 pt offset)
const INFO_Y   = 174;   // Receipt No / Date row top  (was 152 → +22)
const NAME_Y   = 196;   // Name row top               (was 174 → +22)
const TABLE_Y  = 224;   // Table header row top       (was 202 → +22)
const ITEM_Y   = 246;   // Items row top              (was 224 → +22)
const AMT_TBL  = 358;   // Total Amount row top       (was 336 → +22)
const WORDS_Y  = 382;   // Amount in Words row top    (was 360 → +22)

// Column x-offsets
const LBL1_W   = 85;   // "Receipt No:" label width
const VAL1_W   = 210;  // Receipt No value width
const LBL2_W   = 45;   // "Date:" label width
const VAL2_W   = 185;  // Date value width

const COL1_W   = 60;   // Sl. No. column
const COL2_W   = 310;  // Particulars column
const COL3_W   = 155;  // Amount column

const AMT_LBL  = 105;  // Amount section: label width
const AMT_VAL  = 215;  // Amount section: value width

// Derived x positions
const RCPTNO_X = MARGIN + LBL1_W;                   // 120
const DATE_X   = MARGIN + LBL1_W + VAL1_W + LBL2_W; // 375
const NAME_X   = MARGIN + LBL1_W;                   // 120
const SLNO_X   = MARGIN;                             // 35
const COURSE_X = MARGIN + COL1_W;                   // 95
const AMOUNT_X = MARGIN + COL1_W + COL2_W;          // 405
const TOTAL_X  = MARGIN + AMT_LBL;                  // 140

// ── White-out inset (keeps cell border lines visible) ───────────────────────
const INSET = 1;   // inset from each cell edge (pt)

/**
 * Build wipe + text coords for a single table cell.
 * @param {number} x  Cell left edge
 * @param {number} y  Cell top edge
 * @param {number} w  Cell width
 * @param {number} h  Cell height
 * @param {number} [pad=4]  Internal text padding
 */
function cell(x, y, w, h, pad = 4) {
  return {
    wipe: { x: x + INSET, y: y + INSET, w: w - 2 * INSET, h: h - 2 * INSET },
    text: { x: x + pad,  y: y + pad,  w: w - 2 * pad },
  };
}

// ── Coordinate map ───────────────────────────────────────────────────────────
const COORDS = {
  // Receipt No value cell (after "Receipt No:" label)
  RCPTNO: cell(RCPTNO_X, INFO_Y, VAL1_W, ROW_H),

  // Date value cell (after "Date:" label)
  DATE:   cell(DATE_X,   INFO_Y, VAL2_W, ROW_H),

  // Name value cell (spans rest of row after "Name:" label)
  NAME:   cell(NAME_X, NAME_Y, MARGIN + LBL1_W + VAL1_W + LBL2_W + VAL2_W - NAME_X, ROW_H),

  // Sl. No. item cell (80 pt tall — vertically centered text)
  SLNO:   cell(SLNO_X,   ITEM_Y, COL1_W,  ITEM_H, ITEM_H / 2 - 4),

  // Particulars / course name item cell
  COURSE: cell(COURSE_X, ITEM_Y, COL2_W,  ITEM_H, ITEM_H / 2 - 4),

  // Amount item cell
  AMOUNT: cell(AMOUNT_X, ITEM_Y, COL3_W,  ITEM_H, ITEM_H / 2 - 4),

  // Total Amount value cell
  TOTAL:  cell(TOTAL_X,  AMT_TBL, AMT_VAL, AMT_ROW_H),

  // Amount in Words value cell (may be long — use smaller font)
  WORDS:  cell(TOTAL_X,  WORDS_Y, AMT_VAL, AMT_ROW_H),
};

// ── Colors ───────────────────────────────────────────────────────────────────
const COLOR_DARK  = '#111111';
const COLOR_BODY  = '#222222';
const WHITE       = '#FFFFFF';

// ─────────────────────────────────────────────────────────────────────────────
// Helper utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draw the template JPG as a full-page background (no distortion).
 */
function drawBackground(doc) {
  doc.save();
  doc.image(TEMPLATE, 0, 0, { width: PAGE_W, height: PAGE_H });
  doc.restore();
}

/**
 * Fill a rectangle with white to erase the template placeholder text.
 * @param {PDFDocument} doc
 * @param {{x,y,w,h}} rect
 */
function whiteout(doc, { x, y, w, h }) {
  doc.save();
  doc.rect(x, y, w, h).fill(WHITE);
  doc.restore();
}

/**
 * Draw text inside a cell (after whiteout).
 * @param {PDFDocument} doc
 * @param {string}  text
 * @param {{x,y,w}} pos
 * @param {Object}  opts  PDFKit text options + optional font / fontSize / color
 */
function drawCell(doc, text, pos, opts = {}) {
  const {
    font     = 'Helvetica',
    fontSize = 9,
    color    = COLOR_DARK,
    align    = 'left',
    ...rest
  } = opts;

  doc.save();
  doc.font(font).fontSize(fontSize).fillColor(color)
    .text(String(text), pos.x, pos.y, { width: pos.w, align, lineBreak: true, ...rest });
  doc.restore();
}

/**
 * Render text that auto-shrinks if it would overflow the cell width.
 * @param {PDFDocument} doc
 * @param {string}  text
 * @param {{x,y,w}} pos
 * @param {number}  maxSize
 * @param {number}  minSize
 * @param {number}  maxH     Maximum allowed text block height
 * @param {Object}  opts
 */
function fitCell(doc, text, pos, maxSize, minSize, maxH, opts = {}) {
  let size = maxSize;
  while (size > minSize) {
    const h = doc.fontSize(size).heightOfString(String(text), { width: pos.w, ...opts });
    if (h <= maxH) break;
    size -= 0.5;
  }
  doc.fontSize(size).text(String(text), pos.x, pos.y, { width: pos.w, ...opts });
}

/**
 * Compute the current Indian fiscal year string.
 * April–March cycle.  e.g. April 2026 → "2026/27", March 2026 → "2025/26"
 * @param {Date|string} date
 * @returns {string}  e.g. "2026/27"
 */
function getFiscalYear(date) {
  const d = new Date(date);
  const yr = d.getFullYear();
  const mo = d.getMonth() + 1; // 1–12
  const start = mo >= 4 ? yr : yr - 1;
  return `${start}/${String(start + 1).slice(-2)}`;
}

/**
 * Build the formatted receipt number.
 * If serialNumber is provided → "FWT-iZON-RECEIPT-YYYY/YY-{SL}"
 * Otherwise               → use receiptId as-is.
 * @param {string|undefined} receiptId
 * @param {number|undefined} serialNumber
 * @param {Date|string}      date
 * @returns {string}
 */
function buildReceiptNo(receiptId, serialNumber, date) {
  if (serialNumber !== undefined && serialNumber !== null) {
    const fy     = getFiscalYear(date || new Date());
    const padded = String(serialNumber).padStart(2, '0');
    return `FWT-iZON-RECEIPT-${fy}-${padded}`;
  }
  if (receiptId && String(receiptId).startsWith('FWT-iZON-RECEIPT')) {
    return receiptId; // already formatted
  }
  // Fall back: reformat whatever ID is provided
  return receiptId ? String(receiptId) : `FWT-iZON-RECEIPT-${getFiscalYear(new Date())}-01`;
}

/**
 * Format a date for the receipt (DD/MM/YYYY).
 * @param {Date|string} date
 * @returns {string}  e.g. "21/04/2026"
 */
function formatReceiptDate(date) {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Format a number as Indian-locale currency string.
 * @param {number} n
 * @returns {string}  e.g. "4,999"
 */
function fmtINR(n) {
  return Number(n).toLocaleString('en-IN');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a Payment Receipt PDF using the official FWT iZON template.
 * ONLY the dynamic fields are overlaid; everything else comes from the image.
 *
 * @param {Object}        data
 * @param {string}       [data.receiptId]     Full receipt ID (used as-is if no serialNumber)
 * @param {number}       [data.serialNumber]  Serial number (builds formatted receipt no.)
 * @param {string}       [data.userName]      Student / customer name
 * @param {string}       [data.userEmail]     Student email (not displayed on receipt)
 * @param {string}       [data.courseName]    Name of the purchased course
 * @param {number}       [data.amount]        Payment amount in INR
 * @param {Date|string}  [data.date]          Payment date
 * @param {string}       [data.paymentId]     Razorpay payment ID (not displayed)
 * @param {string}       [data.status]        Payment status (not displayed)
 * @returns {Promise<Buffer>}                 PDF as a Buffer
 */
export const generateReceiptPDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        receiptId,
        serialNumber,
        userName    = 'Student',
        courseName  = 'Course',
        amount      = 0,
        date        = new Date(),
      } = data;

      // ── Document setup ───────────────────────────────────────────────────
      const doc = new PDFDocument({
        size:   'A4',
        layout: 'portrait',
        margin: 0,
        info: {
          Title:   `Receipt – ${userName}`,
          Author:  'FWT iZON',
          Subject: 'Payment Receipt',
          Creator: 'FWT iZON Platform',
        },
      });

      const chunks = [];
      doc.on('data',  (c) => chunks.push(c));
      doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Precompute values ────────────────────────────────────────────────
      const receiptNo   = buildReceiptNo(receiptId, serialNumber, date);
      const dateStr     = formatReceiptDate(date);
      const amountFmt   = fmtINR(amount);
      const amountWords = amountToWords(Number(amount));

      // ════════════════════════════════════════════════════════════════════
      // STEP 1 – Full-page template background
      // ════════════════════════════════════════════════════════════════════
      drawBackground(doc);

      // ════════════════════════════════════════════════════════════════════
      // STEP 2 – [Sl No]  →  Receipt No value cell
      //          Full formatted receipt number: "FWT-iZON-RECEIPT-2026/27-01"
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.RCPTNO.wipe);
      doc.fillColor(COLOR_DARK);
      fitCell(
        doc, receiptNo, COORDS.RCPTNO.text,
        /* maxSize */ 8.5, /* minSize */ 6, /* maxH */ ROW_H - 6,
        { font: 'Helvetica', align: 'left', color: COLOR_DARK }
      );

      // ════════════════════════════════════════════════════════════════════
      // STEP 3 – [DATE]  →  Date value cell (DD/MM/YYYY)
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.DATE.wipe);
      drawCell(doc, dateStr, COORDS.DATE.text, {
        font: 'Helvetica', fontSize: 8.5, align: 'left', color: COLOR_DARK,
      });

      // ════════════════════════════════════════════════════════════════════
      // STEP 4 – [NAME]  →  Name value cell
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.NAME.wipe);
      doc.fillColor(COLOR_DARK);
      fitCell(
        doc, userName, COORDS.NAME.text,
        /* maxSize */ 9, /* minSize */ 6.5, /* maxH */ ROW_H - 6,
        { font: 'Helvetica', align: 'left', color: COLOR_DARK }
      );

      // ════════════════════════════════════════════════════════════════════
      // STEP 5 – Sl. No. (item number "1")
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.SLNO.wipe);
      drawCell(doc, '1', COORDS.SLNO.text, {
        font: 'Helvetica', fontSize: 9, align: 'center', color: COLOR_DARK,
      });

      // ════════════════════════════════════════════════════════════════════
      // STEP 6 – <COURSE NAME>  →  Particulars item cell
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.COURSE.wipe);
      doc.fillColor(COLOR_DARK);
      fitCell(
        doc, courseName, COORDS.COURSE.text,
        /* maxSize */ 9, /* minSize */ 6, /* maxH */ ITEM_H - 10,
        { font: 'Helvetica', align: 'center', color: COLOR_DARK }
      );

      // ════════════════════════════════════════════════════════════════════
      // STEP 7 – <AMOUNT>  →  Amount item cell
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.AMOUNT.wipe);
      drawCell(doc, amountFmt, COORDS.AMOUNT.text, {
        font: 'Helvetica', fontSize: 9, align: 'center', color: COLOR_DARK,
      });

      // ════════════════════════════════════════════════════════════════════
      // STEP 8 – <Total Amount>  →  Total Amount value cell
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.TOTAL.wipe);
      drawCell(doc, amountFmt, COORDS.TOTAL.text, {
        font: 'Helvetica', fontSize: 9, align: 'left', color: COLOR_BODY,
      });

      // ════════════════════════════════════════════════════════════════════
      // STEP 9 – <TOTAL AMOUNT IN WORDS>  →  Amount in Words value cell
      // ════════════════════════════════════════════════════════════════════
      whiteout(doc, COORDS.WORDS.wipe);
      doc.fillColor(COLOR_BODY);
      fitCell(
        doc, amountWords, COORDS.WORDS.text,
        /* maxSize */ 7.5, /* minSize */ 5.5, /* maxH */ AMT_ROW_H - 4,
        { font: 'Helvetica', align: 'left', color: COLOR_BODY }
      );

      // ── Finalize ─────────────────────────────────────────────────────────
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
