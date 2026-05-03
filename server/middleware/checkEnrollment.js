import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

/**
 * Middleware to strictly verify if the authenticated user has access
 * to the requested course content.
 * Admins and Instructors automatically bypass this check.
 */
export const checkEnrollment = async (req, res, next) => {
  try {
    // 1. Ensure user is authenticated (should be placed after protect middleware)
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // 2. Admin/Instructor bypass
    if (req.user.role === 'admin' || req.user.role === 'instructor') {
      return next();
    }

    // 3. Extract course ID from params
    // It might be in req.params.id (for /courses/:id/content)
    // or req.params.courseId (if nested route)
    const courseId = req.params.id || req.params.courseId;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required for validation' });
    }

    let courseObjectId = courseId;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(courseId);
    if (!isObjectId) {
      const course = await Course.findOne({ slug: courseId }).select('_id');
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      courseObjectId = course._id;
    }

    // 4. Check enrollment status
    const enrollment = await Enrollment.findOne({
      user: req.user.id,
      course: courseObjectId,
      status: { $in: ['active', 'completed'] } // Only allow active or completed enrollments
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not enrolled in this course or your enrollment is inactive' 
      });
    }

    // 5. Attach enrollment to request for downstream use if needed
    req.enrollment = enrollment;
    
    next();
  } catch (error) {
    console.error('Enrollment validation error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate enrollment status' });
  }
};
