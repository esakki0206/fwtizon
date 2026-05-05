import express from 'express';
import { 
  generateCertificate, 
  getMyCertificates,
  getCertificatesByUserId,
  getCertificateById,
  getMyReceipts,
  serveCertificatePDF,
  serveReceiptPDF,
  verifyCertificate,
} from './certificateController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Student routes (protected)
router.post('/generate', protect, generateCertificate);
router.get('/my', protect, getMyCertificates);
router.get('/user/:userId', protect, getCertificatesByUserId);

// PDF serving routes (View / Download) — MUST be before /:certificateId catch-all
router.get('/:certificateId/view', serveCertificatePDF);
router.get('/:certificateId/download', serveCertificatePDF);

// Public verification + detail
router.get('/:certificateId', getCertificateById);

export default router;

// ── Receipts Router (mounted at /api/receipts in server.js) ───────────────────
export const receiptsRouter = express.Router();
receiptsRouter.get('/my', protect, getMyReceipts);
receiptsRouter.get('/:receiptId/view', protect, serveReceiptPDF);
receiptsRouter.get('/:receiptId/download', protect, serveReceiptPDF);

// ── Verify Router (mounted at /api/verify-certificate in server.js) ───────────
export const verifyRouter = express.Router();
verifyRouter.get('/:id', verifyCertificate);
