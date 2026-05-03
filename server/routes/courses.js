import express from 'express';
import {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseContent,
} from './courseController.js';
import { protect, authorize } from '../middleware/auth.js';
import { checkEnrollment } from '../middleware/checkEnrollment.js';
import reviewRouter from './reviews.js';

const router = express.Router();

router.use('/:courseId/reviews', reviewRouter);

router.get('/:id/content', protect, checkEnrollment, getCourseContent);

router
  .route('/')
  .get(getCourses)
  .post(protect, authorize('instructor', 'admin'), createCourse);

router
  .route('/:id')
  .put(protect, authorize('instructor', 'admin'), updateCourse)
  .delete(protect, authorize('instructor', 'admin'), deleteCourse);

router.route('/:slug').get(getCourse);

export default router;
