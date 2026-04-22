import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMyFeedbackForms,
  getFeedbackForm,
  submitFeedback,
  getFeedbackStatus,
} from './feedbackController.js';

const router = express.Router();

// All student feedback routes require authentication
router.use(protect);

router.get('/my-forms', getMyFeedbackForms);
router.get('/form/:liveCourseId', getFeedbackForm);
router.post('/submit/:formId', submitFeedback);
router.get('/status/:liveCourseId', getFeedbackStatus);

export default router;
