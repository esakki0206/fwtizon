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
    x: 472,
    y: 699,
    width: 842,
    height: 52,
    wipe: { x: 474, y: 701, width: 838, height: 48 },
    baselineAdjust: 0.2,
  },
  date: {
    x: 1778,
    y: 699,
    width: 212,
    height: 52,
    wipe: { x: 1780, y: 701, width: 208, height: 48 },
    baselineAdjust: 0.2,
  },
  name: {
    x: 472,
    y: 751,
    width: 1860,
    height: 50,
    wipe: { x: 474, y: 753, width: 1856, height: 46 },
    baselineAdjust: 0.2,
  },
  slNo: {
    x: 78,
    y: 853,
    width: 80,
    height: 345,
    wipe: { x: 80, y: 855, width: 76, height: 341 },
    baselineAdjust: 0.4,
  },
  course: {
    x: 470,
    y: 853,
    width: 1368,
    height: 345,
    wipe: { x: 472, y: 855, width: 1364, height: 341 },
    baselineAdjust: 0.4,
  },
  amount: {
    x: 1840,
    y: 853,
    width: 535,
    height: 345,
    wipe: { x: 1842, y: 855, width: 531, height: 341 },
    baselineAdjust: 0.4,
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
    x: 470,
    y: 1361,
    width: 1116,
    height: 86,
    wipe: { x: 472, y: 1363, width: 1112, height: 82 },
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
  const drawWidth = align === 'center' ? Math.max(textWidth, 1) : box.width;
  doc.text(text, drawX, drawY, { width: drawWidth, align, lineBreak: false });
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
    const fiscalYear = getFiscalYear(date || new Date());
    const padded = String(serialNumber).padStart(2, '0');
    return `FWT-iZON-RECEIPT-${fiscalYear}-${padded}`;
  }
  if (receiptId && String(receiptId).startsWith('FWT-iZON-RECEIPT')) {
    return receiptId;
  }
  return receiptId ? String(receiptId) : `FWT-iZON-RECEIPT-${getFiscalYear(new Date())}-01`;
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
        minSize: 6.5,
        align: 'left',
        baselineAdjust: POS.receiptNo.baselineAdjust,
      });

      whiteout(doc, POS.date.wipe);
      drawSingleLine(doc, dateStr, POS.date, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 9,
        minSize: 7,
        align: 'left',
        baselineAdjust: POS.date.baselineAdjust,
      });

      whiteout(doc, POS.name.wipe);
      drawSingleLine(doc, String(userName), POS.name, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 9,
        minSize: 6.5,
        align: 'left',
        baselineAdjust: POS.name.baselineAdjust,
      });

      whiteout(doc, POS.slNo.wipe);
      drawSingleLine(doc, '1', POS.slNo, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 10,
        minSize: 8,
        align: 'center',
        baselineAdjust: POS.slNo.baselineAdjust,
      });

      whiteout(doc, POS.course.wipe);
      drawSingleLine(doc, String(courseName), POS.course, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 10,
        minSize: 6,
        align: 'center',
        baselineAdjust: POS.course.baselineAdjust,
      });

      whiteout(doc, POS.amount.wipe);
      drawSingleLine(doc, amountFormatted, POS.amount, {
        font: 'Helvetica',
        color: COLOR_DARK,
        maxSize: 10,
        minSize: 7,
        align: 'center',
        baselineAdjust: POS.amount.baselineAdjust,
      });

      whiteout(doc, POS.total.wipe);
      drawSingleLine(doc, amountFormatted, POS.total, {
        font: 'Helvetica',
        color: COLOR_BODY,
        maxSize: 10,
        minSize: 7,
        align: 'center',
        baselineAdjust: POS.total.baselineAdjust,
      });

      whiteout(doc, POS.words.wipe);
      drawWrapped(doc, amountWords, POS.words, {
        font: 'Helvetica',
        color: COLOR_BODY,
        maxSize: 9,
        minSize: 5.5,
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
