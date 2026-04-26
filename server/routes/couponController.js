import Course from '../models/Course.js';
import LiveCourse from '../models/LiveCourse.js';

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// ── Shared Validation Logic (reused by enrollment controller) ────────────────
/**
 * Validate a coupon code against a specific course and price.
 * Returns { valid, message, coupon?, discountPercentage?, discountAmount?, finalPrice? }
 */
export const validateCouponForCourse = async (code, courseId, coursePrice) => {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return { valid: false, message: 'Coupon code is required' };
  }

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });

  if (!coupon) return { valid: false, message: 'Invalid coupon code' };
  if (!coupon.isActive) return { valid: false, message: 'This coupon is currently inactive' };

  const now = new Date();

  if (coupon.startDate && now < coupon.startDate) {
    return {
      valid: false,
      message: `This coupon is not active yet. It starts on ${coupon.startDate.toLocaleDateString()}`,
    };
  }

  if (now > coupon.expiryDate) {
    return { valid: false, message: 'This coupon has expired' };
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'This coupon has reached its maximum usage limit' };
  }

  if (coupon.minimumPrice !== null && coursePrice < coupon.minimumPrice) {
    return {
      valid: false,
      message: `This coupon requires a minimum course price of ₹${coupon.minimumPrice}`,
    };
  }

  // Course-specific check
  if (coupon.applicableCourses && coupon.applicableCourses.length > 0) {
    const isApplicable = coupon.applicableCourses.some(
      (id) => id.toString() === courseId.toString()
    );
    if (!isApplicable) {
      return { valid: false, message: 'This coupon is not applicable to this course' };
    }
  }

  const discountAmount = Math.round((coursePrice * coupon.discountPercentage) / 100);
  const finalPrice = Math.max(coursePrice - discountAmount, 0);

  return {
    valid: true,
    coupon,
    discountPercentage: coupon.discountPercentage,
    discountAmount,
    finalPrice,
    message: `${coupon.discountPercentage}% discount applied successfully`,
  };
};

// ── POST /api/coupons/validate ───────────────────────────────────────────────
/**
 * @desc  Validate a coupon code for a specific course (used by frontend before payment).
 *        Returns price breakdown — does NOT increment usedCount (that happens on enrollment).
 * @route POST /api/coupons/validate
 * @access Private (authenticated users)
 */
export const validateCoupon = async (req, res) => {
  try {
    const { code, courseId, liveCourseId } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }
    if (!courseId && !liveCourseId) {
      return res.status(400).json({ success: false, message: 'Valid courseId or liveCourseId is required' });
    }

    let targetPrice = null;
    let targetId = null;

    if (courseId) {
      if (!isValidObjectId(courseId)) return res.status(400).json({ success: false, message: 'Invalid courseId' });
      const course = await Course.findById(courseId).select('price title status');
      if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
      if (course.status === 'draft') return res.status(400).json({ success: false, message: 'Course is not available' });
      targetPrice = course.price;
      targetId = courseId;
    } else if (liveCourseId) {
      if (!isValidObjectId(liveCourseId)) return res.status(400).json({ success: false, message: 'Invalid liveCourseId' });
      const { default: LiveCourse } = await import('../models/LiveCourse.js');
      const liveCourse = await LiveCourse.findById(liveCourseId).select('price title status');
      if (!liveCourse) return res.status(404).json({ success: false, message: 'Live Course not found' });
      if (liveCourse.status === 'draft') return res.status(400).json({ success: false, message: 'Live Course is not available' });
      targetPrice = liveCourse.price;
      targetId = liveCourseId;
    }

    const result = await validateCouponForCourse(code, targetId, targetPrice);

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        code: result.coupon.code,
        description: result.coupon.description,
        discountPercentage: result.discountPercentage,
        discountAmount: result.discountAmount,
        originalPrice: targetPrice,
        finalPrice: result.finalPrice,
      },
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/admin/coupons ───────────────────────────────────────────────────
export const listCoupons = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const status = req.query.status; // 'active' | 'inactive' | 'expired' | 'scheduled'
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = {};
    const now = new Date();

    if (search) {
      filter.code = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').toUpperCase(), $options: 'i' };
    }
    if (status === 'active') {
      filter.isActive = true;
      filter.expiryDate = { $gte: now };
    } else if (status === 'inactive') {
      filter.isActive = false;
    } else if (status === 'expired') {
      filter.expiryDate = { $lt: now };
    } else if (status === 'scheduled') {
      filter.isActive = true;
      filter.startDate = { $gt: now };
    }

    const [rawCoupons, total] = await Promise.all([
      Coupon.find(filter)
        .populate('createdBy', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(filter),
    ]);

    // Manually populate applicableCourses from both Course and LiveCourse
    const courseIds = rawCoupons.flatMap((c) => c.applicableCourses || []);
    const uniqueIds = [...new Set(courseIds.map((id) => id.toString()))];

    const [courses, liveCourses] = await Promise.all([
      Course.find({ _id: { $in: uniqueIds } }, 'title _id').lean(),
      LiveCourse.find({ _id: { $in: uniqueIds } }, 'title _id').lean(),
    ]);

    const titleMap = {};
    courses.forEach((c) => { titleMap[c._id.toString()] = { _id: c._id, title: c.title + ' (Course)' }; });
    liveCourses.forEach((c) => { titleMap[c._id.toString()] = { _id: c._id, title: c.title + ' (Live)' }; });

    const coupons = rawCoupons.map(c => ({
      ...c,
      applicableCourses: (c.applicableCourses || []).map(id => titleMap[id.toString()] || { _id: id, title: 'Unknown' })
    }));

    const data = coupons.map((c) => {
      let effectiveStatus;
      if (c.expiryDate < now) {
        effectiveStatus = 'expired';
      } else if (!c.isActive) {
        effectiveStatus = 'inactive';
      } else if (c.startDate && c.startDate > now) {
        effectiveStatus = 'scheduled';
      } else {
        effectiveStatus = 'active';
      }
      return {
        ...c,
        isExpired: c.expiryDate < now,
        effectiveStatus,
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      data,
    });
  } catch (error) {
    console.error('List coupons error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/admin/coupons/:id ───────────────────────────────────────────────
export const getCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }
    const rawCoupon = await Coupon.findById(id)
      .populate('createdBy', 'name email')
      .lean();
    if (!rawCoupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    const courseIds = rawCoupon.applicableCourses || [];
    const uniqueIds = [...new Set(courseIds.map((cid) => cid.toString()))];

    const [courses, liveCourses] = await Promise.all([
      Course.find({ _id: { $in: uniqueIds } }, 'title _id').lean(),
      LiveCourse.find({ _id: { $in: uniqueIds } }, 'title _id').lean(),
    ]);

    const titleMap = {};
    courses.forEach((c) => { titleMap[c._id.toString()] = { _id: c._id, title: c.title + ' (Course)' }; });
    liveCourses.forEach((c) => { titleMap[c._id.toString()] = { _id: c._id, title: c.title + ' (Live)' }; });

    const coupon = {
      ...rawCoupon,
      applicableCourses: courseIds.map(cid => titleMap[cid.toString()] || { _id: cid, title: 'Unknown' })
    };

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/admin/coupons ──────────────────────────────────────────────────
export const createCoupon = async (req, res) => {
  try {
    const {
      code, description, discountPercentage, isActive,
      startDate, expiryDate, usageLimit, minimumPrice, applicableCourses,
    } = req.body;

    // ── Server-side validation ──
    if (!code || !/^[A-Z0-9_-]{3,20}$/i.test(String(code).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code must be 3–20 characters (letters, digits, underscore, hyphen)',
      });
    }
    const pct = Number(discountPercentage);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      return res.status(400).json({ success: false, message: 'Discount percentage must be between 1 and 100' });
    }
    if (!expiryDate) {
      return res.status(400).json({ success: false, message: 'Expiry date is required' });
    }
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid expiry date format' });
    }
    if (expiry <= new Date()) {
      return res.status(400).json({ success: false, message: 'Expiry date must be in the future' });
    }

    let start = null;
    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid start date format' });
      }
      if (start >= expiry) {
        return res.status(400).json({ success: false, message: 'Start date must be before expiry date' });
      }
    }

    if (usageLimit !== undefined && usageLimit !== null && usageLimit !== '') {
      const ul = Number(usageLimit);
      if (isNaN(ul) || ul < 1 || !Number.isInteger(ul)) {
        return res.status(400).json({ success: false, message: 'Usage limit must be a positive integer' });
      }
    }
    if (minimumPrice !== undefined && minimumPrice !== null && minimumPrice !== '') {
      const mp = Number(minimumPrice);
      if (isNaN(mp) || mp < 0) {
        return res.status(400).json({ success: false, message: 'Minimum price must be zero or greater' });
      }
    }

    // Uniqueness check (Mongoose unique index also catches this, but give a clear message)
    const existing = await Coupon.findOne({ code: String(code).trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A coupon with this code already exists' });
    }

    const courses = Array.isArray(applicableCourses)
      ? applicableCourses.filter((id) => isValidObjectId(String(id)))
      : [];

    const coupon = await Coupon.create({
      code: String(code).trim().toUpperCase(),
      description: description ? String(description).trim() : '',
      discountPercentage: pct,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      startDate: start,
      expiryDate: expiry,
      usageLimit: (usageLimit !== undefined && usageLimit !== null && usageLimit !== '')
        ? Number(usageLimit) : null,
      minimumPrice: (minimumPrice !== undefined && minimumPrice !== null && minimumPrice !== '')
        ? Number(minimumPrice) : null,
      applicableCourses: courses,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A coupon with this code already exists' });
    }
    console.error('Create coupon error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PUT /api/admin/coupons/:id ───────────────────────────────────────────────
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    const {
      code, description, discountPercentage, isActive,
      startDate, expiryDate, usageLimit, minimumPrice, applicableCourses,
    } = req.body;

    if (code !== undefined) {
      const trimmed = String(code).trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,20}$/.test(trimmed)) {
        return res.status(400).json({ success: false, message: 'Coupon code must be 3–20 characters (letters, digits, _, -)' });
      }
      const existing = await Coupon.findOne({ code: trimmed, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Another coupon with this code already exists' });
      }
      coupon.code = trimmed;
    }

    if (discountPercentage !== undefined) {
      const pct = Number(discountPercentage);
      if (isNaN(pct) || pct < 1 || pct > 100) {
        return res.status(400).json({ success: false, message: 'Discount percentage must be between 1 and 100' });
      }
      coupon.discountPercentage = pct;
    }

    if (expiryDate !== undefined) {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid expiry date' });
      }
      coupon.expiryDate = expiry;
    }

    if (startDate !== undefined) {
      if (startDate === null || startDate === '') {
        coupon.startDate = null;
      } else {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid start date' });
        }
        if (start >= (expiryDate ? new Date(expiryDate) : coupon.expiryDate)) {
          return res.status(400).json({ success: false, message: 'Start date must be before expiry date' });
        }
        coupon.startDate = start;
      }
    }

    if (isActive !== undefined) coupon.isActive = Boolean(isActive);
    if (description !== undefined) coupon.description = String(description).trim();
    if (usageLimit !== undefined) {
      coupon.usageLimit = (usageLimit === null || usageLimit === '') ? null : Number(usageLimit);
    }
    if (minimumPrice !== undefined) {
      coupon.minimumPrice = (minimumPrice === null || minimumPrice === '') ? null : Number(minimumPrice);
    }
    if (applicableCourses !== undefined) {
      coupon.applicableCourses = Array.isArray(applicableCourses)
        ? applicableCourses.filter((cid) => isValidObjectId(String(cid)))
        : [];
    }

    await coupon.save();

    const rawPopulated = await Coupon.findById(id)
      .populate('createdBy', 'name email')
      .lean();

    const courseIds = rawPopulated.applicableCourses || [];
    const uniqueIds = [...new Set(courseIds.map((cid) => cid.toString()))];

    const [courses, liveCourses] = await Promise.all([
      Course.find({ _id: { $in: uniqueIds } }, 'title _id').lean(),
      LiveCourse.find({ _id: { $in: uniqueIds } }, 'title _id').lean(),
    ]);

    const titleMap = {};
    courses.forEach((c) => { titleMap[c._id.toString()] = { _id: c._id, title: c.title + ' (Course)' }; });
    liveCourses.forEach((c) => { titleMap[c._id.toString()] = { _id: c._id, title: c.title + ' (Live)' }; });

    const populated = {
      ...rawPopulated,
      applicableCourses: courseIds.map(cid => titleMap[cid.toString()] || { _id: cid, title: 'Unknown' })
    };

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PATCH /api/admin/coupons/:id/toggle ─────────────────────────────────────
export const toggleCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }
    const coupon = await Coupon.findById(id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      data: { _id: coupon._id, isActive: coupon.isActive },
      message: coupon.isActive ? 'Coupon activated' : 'Coupon deactivated',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/admin/coupons/:id ────────────────────────────────────────────
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid coupon ID' });
    }
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.status(200).json({ success: true, data: {}, message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
