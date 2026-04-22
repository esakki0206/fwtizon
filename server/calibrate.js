/**
 * Calibration script: Renders each template with a grid overlay
 * to identify exact placeholder positions for dynamic text.
 * Grid lines are drawn every 50 PDF points with labels.
 */
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, 'assets', 'images');

const PAGE_W = 595.28;
const PAGE_H = 841.89;

function createCalibrationPDF(templatePath, outputPath) {
  const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 0 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Draw template as background
  doc.image(templatePath, 0, 0, { width: PAGE_W, height: PAGE_H });

  // Draw horizontal grid lines every 50pt
  for (let y = 0; y <= PAGE_H; y += 50) {
    doc.save();
    doc.moveTo(0, y).lineTo(PAGE_W, y)
      .lineWidth(0.3)
      .strokeColor(y % 100 === 0 ? 'red' : 'blue')
      .stroke();
    doc.font('Helvetica').fontSize(6).fillColor('red')
      .text(`y=${y}`, 2, y + 1, { width: 40 });
    doc.restore();
  }

  // Draw vertical grid lines every 50pt
  for (let x = 0; x <= PAGE_W; x += 50) {
    doc.save();
    doc.moveTo(x, 0).lineTo(x, PAGE_H)
      .lineWidth(0.3)
      .strokeColor(x % 100 === 0 ? 'red' : 'blue')
      .stroke();
    if (x > 0) {
      doc.font('Helvetica').fontSize(5).fillColor('red')
        .text(`${x}`, x + 1, 2, { width: 30 });
    }
    doc.restore();
  }

  doc.end();
  return new Promise((resolve) => stream.on('finish', resolve));
}

async function main() {
  await createCalibrationPDF(
    path.join(IMAGES_DIR, 'FWT iZON Certificate_page-0001.jpg'),
    'calibrate_certificate.pdf'
  );
  console.log('Created calibrate_certificate.pdf');

  await createCalibrationPDF(
    path.join(IMAGES_DIR, 'FWT iZON Receipt_page-0001.jpg'),
    'calibrate_receipt.pdf'
  );
  console.log('Created calibrate_receipt.pdf');
}

main();
