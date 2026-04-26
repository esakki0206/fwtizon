import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const TEMPLATE = path.join(IMAGES_DIR, 'FWT iZON Certificate_page-0001.jpg');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const TEMPLATE_W = 2482;
const TEMPLATE_H = 3510;
const SCALE_X = PAGE_W / TEMPLATE_W;
const SCALE_Y = PAGE_H / TEMPLATE_H;

const WHITE = '#FFFFFF';
const COLOR_DARK = '#111111';
const COLOR_NAVY = '#1B2A4A';
const COLOR_ORANGE = '#EA580C'; // Professional orange color

const POS = {
  name: {
    x: 620,
    y: 1079,          // ⬅️ FIXED (was 1150 → too high)
    width: 1240,
    height: 180,      // ⬅️ tighter box (prevents vertical drift)
    wipe: { x: 660, y: 1080, width: 1160, height: 200 },
    baselineAdjust: 1.5,
  },

  course: {
    x: 700,
    y: 1465,          // ⬅️ FIXED (moved down for proper spacing)
    width: 1080,
    height: 160,
    wipe: { x: 820, y: 1465, width: 860, height: 180 },
    baselineAdjust: 2,
  },

  date: {
    x: 2191,
    y: 3300,
    width: 141,
    height: 41,
    wipe: { x: 2194, y: 3292, width: 158, height: 54 },
    baselineAdjust: 0.3,
  },

  slNo: {
    x: 2195,
    y: 3371,
    width: 151,
    height: 24,
    wipe: { x: 2194, y: 3371, width: 162, height: 55 },
    baselineAdjust: 0.2,
  },
};

function toPdfX(value) {
  return value * SCALE_X;
}

function toPdfY(value) {
  return value * SCALE_Y;
}

function toPdfW(value) {
  return value * SCALE_X;
}

function toPdfH(value) {
  return value * SCALE_Y;
}

function toPdfRect({ x, y, width, height }) {
  return {
    x: toPdfX(x),
    y: toPdfY(y),
    width: toPdfW(width),
    height: toPdfH(height),
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
    if (doc.widthOfString(text) <= width) {
      break;
    }
    size -= 0.5;
  }

  return size;
}

function drawSingleLine(doc, text, field, options) {
  const {
    font,
    color,
    maxSize,
    minSize = maxSize,
    align = 'left',
    baselineAdjust = 0,
  } = options;

  const box = toPdfRect(field);

  doc.save();
  doc.font(font);

  const fontSize = fitText(doc, text, box.width, maxSize, minSize);
  doc.fontSize(fontSize).fillColor(color);

  const textWidth = doc.widthOfString(text);
  const textHeight = doc.heightOfString(text, { lineBreak: false });

  let drawX = box.x;
  if (align === 'center') {
    drawX += Math.max(0, (box.width - textWidth) / 2);
  } else if (align === 'right') {
    drawX += Math.max(0, box.width - textWidth);
  }

  const drawY = box.y + Math.max(0, (box.height - textHeight) / 2) + baselineAdjust;
  doc.text(text, drawX, drawY, {
    lineBreak: false,
  });

  doc.restore();
}

function fitMultiLineText(doc, text, boxWidth, boxHeight, maxSize, minSize, align) {
  let size = maxSize;
  while (size > minSize) {
    doc.fontSize(size);
    const height = doc.heightOfString(text, { width: boxWidth, align: align });
    if (height <= boxHeight) {
      break;
    }
    size -= 0.5;
  }
  return size;
}

function drawMultiLineText(doc, text, field, options) {
  const {
    font,
    color,
    maxSize,
    minSize = maxSize,
    align = 'center',
    baselineAdjust = 0,
  } = options;

  const box = toPdfRect(field);

  doc.save();
  doc.font(font);

  const fontSize = fitMultiLineText(doc, text, box.width, box.height, maxSize, minSize, align);
  doc.fontSize(fontSize).fillColor(color);

  const textHeight = doc.heightOfString(text, { width: box.width, align });

  const drawY = box.y + Math.max(0, (box.height - textHeight) / 2) + baselineAdjust;
  
  doc.text(text, box.x, drawY, {
    width: box.width,
    align,
    lineBreak: true,
  });

  doc.restore();
}

function formatCertDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getCertificateSerial(certificateId, serialNumber) {
  if (serialNumber !== undefined && serialNumber !== null) {
    return String(serialNumber).padStart(4, '0');
  }

  const match = String(certificateId || '').match(/(\d+)(?!.*\d)/);
  return match ? match[1] : '0000';
}

export const generateCertificatePDF = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const {
        studentName = 'STUDENT NAME',
        courseName = 'Course Name',
        domain = 'Professional Development',
        areaOfExpertise = 'Specialized',
        completionDate = new Date(),
        certificateId = 'FWT-IZON-0000',
        serialNumber,
      } = data;

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 0,
        info: {
          Title: `Certificate of Completion - ${studentName}`,
          Author: 'FWT iZON',
          Subject: 'Certificate of Completion',
          Creator: 'FWT iZON Platform',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.registerFont('GreatVibes', path.join(FONTS_DIR, 'GreatVibes-Regular.ttf'));

      drawBackground(doc);

      whiteout(doc, POS.name.wipe);
      drawMultiLineText(doc, String(studentName).toUpperCase(), POS.name, {
        font: 'Helvetica-Bold',
        color: COLOR_DARK,
        maxSize: 28,
        minSize: 18,
        align: 'center',
        baselineAdjust: POS.name.baselineAdjust,
      });

      whiteout(doc, POS.course.wipe);
      drawMultiLineText(doc, String(courseName), POS.course, {
        font: 'Helvetica-Bold',
        color: COLOR_ORANGE,
        maxSize: 29,
        minSize: 12,
        align: 'center',
        baselineAdjust: POS.course.baselineAdjust,
      });



      whiteout(doc, POS.date.wipe);
      drawSingleLine(doc, formatCertDate(completionDate), POS.date, {
        font: 'Helvetica-Bold',
        color: COLOR_NAVY,
        maxSize: 12,
        minSize: 8.5,
        align: 'left',
        baselineAdjust: POS.date.baselineAdjust,
      });

      whiteout(doc, POS.slNo.wipe);
      drawSingleLine(doc, getCertificateSerial(certificateId, serialNumber), POS.slNo, {
        font: 'Helvetica-Bold',
        color: COLOR_NAVY,
        maxSize: 12,
        minSize: 4,
        align: 'left',
        baselineAdjust: POS.slNo.baselineAdjust,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
