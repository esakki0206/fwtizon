import express from 'express';
import { 
  generateCertificate, 
  getMyCertificates,
  getCertificatesByUserId,
  getCertificateById,
  getMyReceipts,
  serveCertificatePDF,
  serveReceiptPDF
} from './certificateController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Student routes (protected)
router.post('/generate', protect, generateCertificate);
router.get('/my', protect, getMyCertificates);
router.get('/user/:userId', protect, getCertificatesByUserId);

// PDF serving routes (View / Download) — using path params
router.get('/:certificateId/view', serveCertificatePDF);
router.get('/:certificateId/download', serveCertificatePDF);

// Public route for viewing/verifying a certificate details
router.get('/:certificateId', getCertificateById);

export default router;

// Explicit Receipts router (mounted at /api/receipts in server.js)
export const receiptsRouter = express.Router();
receiptsRouter.get('/my', protect, getMyReceipts);
receiptsRouter.get('/:receiptId/view', protect, serveReceiptPDF);
receiptsRouter.get('/:receiptId/download', protect, serveReceiptPDF);

