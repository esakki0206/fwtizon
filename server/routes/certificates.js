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
router.get('/user/:userId', protect, getCertificatesByUserId); // explicit requested standard

// PDF serving routes (View / Download)
router.get('/view', serveCertificatePDF);
router.get('/download', serveCertificatePDF);
router.get('/:certificateId/view', serveCertificatePDF);
router.get('/:certificateId/download', serveCertificatePDF);

// Public route for viewing/verifying a certificate details
router.get('/:certificateId', getCertificateById);

// Export router. In server.js we will mount this as /api/certificates
// We'll also mount the receipts via server.js or a separate router, 
// but for simplicity we can export a receipts router here too.
export default router;

// Explicit Receipts router to avoid mapping /api/certificates to receipts
export const receiptsRouter = express.Router();
receiptsRouter.get('/my', protect, getMyReceipts);
receiptsRouter.get('/view', protect, serveReceiptPDF);
receiptsRouter.get('/download', protect, serveReceiptPDF);
receiptsRouter.get('/:receiptId/view', protect, serveReceiptPDF);
receiptsRouter.get('/:receiptId/download', protect, serveReceiptPDF);
