import Course from '../models/Course.js';

// ─── Helper ────────────────────────────────────────────────────────────────
// Merges course's optional display overrides with the populated User data so
// the frontend always gets a single consistent { name, photo } no matter how
// the course was configured.
const attachDisplayInstructor = (course) => {
  const obj = course.toObject ? course.toObject() : { ...course };
  obj.displayInstructorName =
    obj.instructorName && obj.instructorName.trim()
      ? obj.instructorName.trim()
      : obj.instructor?.name || 'Fwtion Academy';
  obj.displayInstructorPhoto =
    obj.instructorPhoto && obj.instructorPhoto.trim()
      ? obj.instructorPhoto.trim()
      : obj.instructor?.avatar || '';
  return obj;
};

// @desc    Get all published courses (public)
// @route   GET /api/courses
// @access  Public
export const getCourses = async (req, res) => {
  try {
    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit', 'keyword'];
    removeFields.forEach(param => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    let query = Course.find(JSON.parse(queryStr)).populate({
      path: 'instructor',
      select: 'name avatar',
    });

    if (req.query.keyword) {
      query = query.find({
        title: { $regex: req.query.keyword, $options: 'i' },
      });
    }

    // Public route: only published courses
    query = query.where({ status: 'published' });

    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Course.countDocuments({ status: 'published' });

    query = query.skip(startIndex).limit(limit);

    const courses = await query;

    const pagination = {};
    if (endIndex < total) pagination.next = { page: page + 1, limit };
    if (startIndex > 0) pagination.prev = { page: page - 1, limit };

    res.status(200).json({
      success: true,
      count: courses.length,
      pagination,
      data: courses.map(attachDisplayInstructor),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single course by slug or ObjectId
// @route   GET /api/courses/:slug
// @access  Public
export const getCourse = async (req, res) => {
  try {
    const param = req.params.slug;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);
    const filter = isObjectId ? { _id: param } : { slug: param };

    const course = await Course.findOne(filter)
      .populate({
        path: 'instructor',
        select: 'name avatar description bio',
      })
      .populate({
        path: 'modules',
        select: 'title order lessons quiz',
        populate: {
          path: 'lessons',
          select: 'title type duration isPreview order description resources',
        },
      });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({
      success: true,
      data: attachDisplayInstructor(course),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get full course content (Protected)
// @route   GET /api/courses/:id/content
// @access  Private (Enrolled users, Instructors, Admins)
export const getCourseContent = async (req, res) => {
  try {
    const param = req.params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);
    const filter = isObjectId ? { _id: param } : { slug: param };

    const course = await Course.findOne(filter)
      .populate({
        path: 'instructor',
        select: 'name avatar description bio',
      })
      .populate({
        path: 'modules',
        select: 'title order lessons quiz',
        populate: {
          path: 'lessons',
          // Get all fields including content, zoomEmbedLink, zoomPassword
        },
      });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.status(200).json({
      success: true,
      data: attachDisplayInstructor(course),
      progress: req.enrollment ? req.enrollment.progress : null
    });
  } catch (error) {
    console.error('getCourseContent error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch course content' });
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Instructor/Admin
export const createCourse = async (req, res) => {
  try {
    req.body.instructor = req.user.id;

    // Normalise status to lowercase so DB validation passes
    if (req.body.status) {
      req.body.status = req.body.status.toLowerCase();
    }

    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Instructor/Admin
export const updateCourse = async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to update this course`,
      });
    }

    // Normalise status to lowercase so DB validation passes
    if (req.body.status) {
      req.body.status = req.body.status.toLowerCase();
    }

    // Validate price is non-negative when provided
    if (req.body.price !== undefined && req.body.price < 0) {
      return res.status(400).json({ success: false, message: 'Price cannot be negative' });
    }

    // Validate instructorName when provided
    if (req.body.instructorName !== undefined && req.body.instructorName.trim() === '') {
      return res.status(400).json({ success: false, message: 'Instructor name cannot be empty' });
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate({ path: 'instructor', select: 'name avatar' });

    res.status(200).json({
      success: true,
      data: attachDisplayInstructor(course),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Instructor/Admin
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: `User ${req.user.id} is not authorized to delete this course`,
      });
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
