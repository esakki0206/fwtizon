/**
 * test_pdfs.js
 *
 * Run with:  node --experimental-vm-modules test_pdfs.js
 * Or add "type": "module" to package.json and run:  node test_pdfs.js
 *
 * Outputs:
 *   test_certificate.pdf  – verify name, course, domain, expertise, date overlay
 *   test_receipt.pdf      – verify receipt no, date, name, course, amount overlay
 */

import fs from 'fs';
import { generateCertificatePDF } from './utils/generateCertificatePDF.js';
import { generateReceiptPDF } from './utils/generateReceiptPDF.js';

// ── Certificate test data ─────────────────────────────────────────────────────
const certData = {
  studentName: 'Esakki Muthu The Great Conqueror ',
  courseName: 'Advanced Masterclass in Full Stack Web Development',
  domain: 'Web Development',
  areaOfExpertise: 'MERN Stack Engineering',
  completionDate: new Date('2026-04-21'),
  certificateId: 'FWT-IZON-2026-0001',
  serialNumber: 1,
};

// ── Receipt test data ─────────────────────────────────────────────────────────
const rcptData = {
  receiptId: 'FWT-iZON-RECEIPT-2026/27-01',   // full formatted ID
  serialNumber: 1,                                 // OR provide serialNumber alone
  userName: 'Esakki Muthu',
  userEmail: 'esakki@example.com',
  courseName: 'Full Stack Web Development',
  amount: 4999,
  date: new Date('2026-04-21'),
  status: 'SUCCESS',
};

async function main() {
  console.log('Generating Certificate PDF…');
  try {
    const certBuf = await generateCertificatePDF(certData);
    fs.writeFileSync('test_certificate.pdf', certBuf);
    console.log(`  ✓ test_certificate.pdf  (${certBuf.length.toLocaleString()} bytes)`);
  } catch (e) {
    console.error('  ✗ Certificate generation failed:', e.message);
  }

  console.log('Generating Receipt PDF…');
  try {
    const rcptBuf = await generateReceiptPDF(rcptData);
    fs.writeFileSync('test_receipt.pdf', rcptBuf);
    console.log(`  ✓ test_receipt.pdf      (${rcptBuf.length.toLocaleString()} bytes)`);
  } catch (e) {
    console.error('  ✗ Receipt generation failed:', e.message);
  }

  console.log('\nDone — open both PDFs and verify text positions match the template.');
  console.log('Fine-tune x/y constants in COORDS if any field is misaligned.');
}

main();
