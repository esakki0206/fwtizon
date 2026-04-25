import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { amountToWords } from './numberToWords.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const TEMPLATE = path.join(IMAGES_DIR, 'FWT iZON Receipt_page-0001.jpg');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const TEMPLATE_W = 2481;
const TEMPLATE_H = 3509;
const SCALE_X = PAGE_W / TEMPLATE_W;
const SCALE_Y = PAGE_H / TEMPLATE_H;

const WHITE = '#FFFFFF';
const COLOR_DARK = '#111111';
const COLOR_BODY = '#222222';

const POS = {
  receiptNo: {
    x: 1096,
    y: 705,
    width: 155,
    height: 50,
    wipe: { x: 1096, y: 704, width: 155, height: 40 },
    baselineAdjust: 0.2,
  },
  date: {
    x: 1592,
    y: 704,
    width: 331,
    height: 38,
    wipe: { x: 1588, y: 700, width: 339, height: 46 },
    baselineAdjust: 0.2,
  },
  name: {
    x: 472,
    y: 765,
    width: 693,
    height: 38,
    wipe: { x: 471, y: 750, width: 702, height: 46 },
    baselineAdjust: 0.2,
  },
  slNo: {
    x: 1084,
    y: 704,
    width: 136,
    height: 38,
    wipe: { x: 1080, y: 700, width: 130, height: 43 },
    baselineAdjust: 0.2,
  },
  course: {
    x: 989,
    y: 1005,
    width: 324,
    height: 38,
    wipe: { x: 970, y: 1001, width: 360, height: 46 },
    baselineAdjust: 0.2,
  },
  amount: {
    x: 1980,
    y: 1005,
    width: 226,
    height: 38,
    wipe: { x: 1978, y: 1001, width: 264, height: 46 },
    baselineAdjust: 0.2,
  },
  total: {
    x: 470,
    y: 1258,
    width: 1116,
    height: 103,
    wipe: { x: 472, y: 1260, width: 1112, height: 99 },
    baselineAdjust: 0.2,
  },
  words: {
    x: 740,
    y: 1353,
    width: 592,
    height: 40,
    wipe: { x: 720, y: 1349, width: 625, height: 48 },
    baselineAdjust: 0.2,
  },
};

function toPdfRect({ x, y, width, height }) {
  return {
    x: x * SCALE_X,
    y: y * SCALE_Y,
    width: width * SCALE_X,
    height: height * SCALE_Y,
  };
}

function drawBackground(doc) {
  doc.save();
  doc.image(TEMPLATE, 0, 0, { width: PAGE_W, height: PAGE_H });
  doc.restore();
}

function whiteout(doc, rect) {
  const box = toPdfRect(rect);
  doc.save();
  doc.rect(box.x, box.y, box.width, box.height).fill(WHITE);
  doc.restore();
}

function fitText(doc, text, width, maxSize, minSize) {
  let size = maxSize;
  while (size > minSize) {
    doc.fontSize(size);
    if (doc.widthOfString(text) <= width) break;
    size -= 0.5;
  }
  return size;
}

function fitWrappedText(doc, text, width, height, maxSize, minSize, options = {}) {
  let size = maxSize;
  while (size > minSize) {
    doc.fontSize(size);
    const renderedHeight = doc.heightOfString(text, { width, ...options });
    if (renderedHeight <= height) break;
    size -= 0.5;
  }
  return size;
}

function drawSingleLine(doc, text, field, options) {
  const { font, color, maxSize, minSize = maxSize, align = 'left', baselineAdjust = 0 } = options;
  const box = toPdfRect(field);
  doc.save();
  doc.font(font);
  const fontSize = fitText(doc, text, box.width, maxSize, minSize);
  doc.fontSize(fontSize).fillColor(color);
  const textWidth = doc.widthOfString(text);
  const textHeight = doc.heightOfString(text, { lineBreak: false });
  let drawX = box.x;
  if (align === 'center') drawX += Math.max(0, (box.width - textWidth) / 2);
  else if (align === 'right') drawX += Math.max(0, box.width - textWidth);
  const drawY = box.y + Math.max(0, (box.height - textHeight) / 2) + baselineAdjust;
  doc.text(text, drawX, drawY, { lineBreak: false });
  doc.restore();
}

function drawWrapped(doc, text, field, options) {
  const { font, color, maxSize, minSize = maxSize, align = 'left', baselineAdjust = 0, lineGap = 0 } = options;
  const box = toPdfRect(field);
  doc.save();
  doc.font(font);
  const fontSize = fitWrappedText(doc, text, box.width, box.height, maxSize, minSize, { align, lineGap });
  doc.fontSize(fontSize).fillColor(color);
  const renderedHeight = doc.heightOfString(text, { width: box.width, align, lineGap });
  const drawY = box.y + Math.max(0, (box.height - renderedHeight) / 2) + baselineAdjust;
  doc.text(text, box.x, drawY, { width: box.width, align, lineGap });
  doc.restore();
}

/**
 * Returns fiscal year string as "2024-25" (dash, not slash).
 * IMPORTANT: The slash format "2024/25" breaks URL routing when used in receiptId.
 */
function getFiscalYear(date) {
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  // Use dash "-" NOT slash "/" — slash breaks Express URL param routing
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

function buildReceiptNo(receiptId, serialNumber, date) {
  if (serialNumber !== undefined && serialNumber !== null) {
    return String(serialNumber).padStart(4, '0');
  }

  if (receiptId) {
    const match = String(receiptId).match(/-(\d+)$/);
    if (match) return match[1].padStart(4, '0');
    return String(receiptId);
  }

  return '0001';
}

function formatReceiptDate(date) {
  const parsed = new Date(date);
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${parsed.getFullYear()}`;
}

function formatInr(amount) {
  return Number(amount).toLocaleString('en-IN');
}

export const generateReceiptPDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        receiptId,
        serialNumber,
        userName = 'Student',
        courseName = 'Course',
        amount = 0,
        date = new Date(),
      } = data;

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 0,
        info: {
          Title: `Receipt - ${userName}`,
          Author: 'FWT iZON',
          Subject: 'Payment Receipt',
          Creator: 'FWT iZON Platform',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const receiptNo = buildReceiptNo(receiptId, serialNumber, date);
      const dateStr = formatReceiptDate(date);
      const amountFormatted = formatInr(amount);
      const amountWords = amountToWords(Number(amount));

      drawBackground(doc);

      whiteout(doc, POS.receiptNo.wipe);
      drawSingleLine(doc, receiptNo, POS.receiptNo, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 9.5,
        minSize: 4,
        align: 'left',
        baselineAdjust: POS.receiptNo.baselineAdjust,
      });

      whiteout(doc, POS.date.wipe);
      drawSingleLine(doc, dateStr, POS.date, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 9,
        minSize: 4,
        align: 'left',
        baselineAdjust: POS.date.baselineAdjust,
      });

      whiteout(doc, POS.name.wipe);
      drawSingleLine(doc, String(userName), POS.name, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 9,
        minSize: 4,
        align: 'left',
        baselineAdjust: POS.name.baselineAdjust,
      });

      // slNo rendering removed as requested

      whiteout(doc, POS.course.wipe);
      drawSingleLine(doc, String(courseName), POS.course, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 11,
        minSize: 7,
        align: 'center',
        baselineAdjust: POS.course.baselineAdjust,
      });

      whiteout(doc, POS.amount.wipe);
      drawSingleLine(doc, amountFormatted, POS.amount, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 9,
        minSize: 5,
        align: 'center',
        baselineAdjust: POS.amount.baselineAdjust,
      });

      whiteout(doc, POS.total.wipe);
      drawSingleLine(doc, amountFormatted, POS.total, {
        font: 'Helvetica',
        color: COLOR_BODY,
        maxSize: 11,
        minSize: 8,
        align: 'center',
        baselineAdjust: POS.total.baselineAdjust,
      });

      whiteout(doc, POS.words.wipe);
      drawWrapped(doc, amountWords, POS.words, {
        font: 'Helvetica',
        color: COLOR_BODY,
        maxSize: 8,
        minSize: 6,
        align: 'center',
        lineGap: 1,
        baselineAdjust: POS.words.baselineAdjust,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
