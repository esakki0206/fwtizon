const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const cleanString = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const normalizeDateValue = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError(`Invalid ${fieldName}`);
  }

  return parsed;
};

const normalizeTimeValue = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw createValidationError(`Invalid ${fieldName}`);
  }

  const trimmed = value.trim();
  if (!TIME_PATTERN.test(trimmed)) {
    throw createValidationError(`${fieldName} must be in HH:mm format`);
  }

  return trimmed;
};

const toMinutes = (timeValue) => {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(':').map(Number);
  return (hours * 60) + minutes;
};

const normalizeSchedule = (schedule) => {
  if (!Array.isArray(schedule)) return undefined;

  return schedule
    .map((slot) => ({
      day: cleanString(slot?.day),
      time: normalizeTimeValue(slot?.time, 'Schedule time'),
      topic: cleanString(slot?.topic),
    }))
    .filter((slot) => slot.day || slot.time || slot.topic);
};

export const sanitizeLiveCoursePayload = (payload = {}, options = {}) => {
  const { existingCourse } = options;

  const nextPayload = { ...payload };

  nextPayload.title = cleanString(nextPayload.title);
  nextPayload.description = cleanString(nextPayload.description);
  nextPayload.duration = cleanString(nextPayload.duration);
  nextPayload.zoomLink = cleanString(nextPayload.zoomLink);
  nextPayload.whatsappGroup = cleanString(nextPayload.whatsappGroup);
  nextPayload.thumbnail = cleanString(nextPayload.thumbnail);
  nextPayload.instructorName = cleanString(nextPayload.instructorName);
  nextPayload.instructorImage = cleanString(nextPayload.instructorImage);
  nextPayload.instructorDesignation = cleanString(nextPayload.instructorDesignation);
  nextPayload.instructorBio = cleanString(nextPayload.instructorBio);
  nextPayload.domain = cleanString(nextPayload.domain);
  nextPayload.areaOfExpertise = cleanString(nextPayload.areaOfExpertise);

  nextPayload.startDate = normalizeDateValue(nextPayload.startDate, 'start date');
  nextPayload.endDate = normalizeDateValue(nextPayload.endDate, 'end date');
  nextPayload.classStartTime = normalizeTimeValue(nextPayload.classStartTime, 'Class start time');
  nextPayload.classEndTime = normalizeTimeValue(nextPayload.classEndTime, 'Class end time');
  nextPayload.timezone = cleanString(nextPayload.timezone) || existingCourse?.timezone || 'Asia/Kolkata';

  if (nextPayload.classEndTime && !nextPayload.classStartTime) {
    throw createValidationError('Class start time is required when class end time is set');
  }

  if (nextPayload.classStartTime && nextPayload.classEndTime) {
    const startMinutes = toMinutes(nextPayload.classStartTime);
    const endMinutes = toMinutes(nextPayload.classEndTime);
    if (endMinutes <= startMinutes) {
      throw createValidationError('Class end time must be after class start time');
    }
  }

  if (nextPayload.startDate && nextPayload.endDate && nextPayload.endDate < nextPayload.startDate) {
    throw createValidationError('End date must be on or after start date');
  }

  if (nextPayload.price !== undefined && nextPayload.price !== '') {
    const parsedPrice = Number(nextPayload.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      throw createValidationError('Price must be a valid non-negative number');
    }
    nextPayload.price = parsedPrice;
  }

  if (nextPayload.maxStudents !== undefined && nextPayload.maxStudents !== '') {
    const parsedMaxStudents = Number(nextPayload.maxStudents);
    if (!Number.isInteger(parsedMaxStudents) || parsedMaxStudents < 1) {
      throw createValidationError('Max students must be at least 1');
    }
    nextPayload.maxStudents = parsedMaxStudents;
  }

  if (nextPayload.schedule !== undefined) {
    nextPayload.schedule = normalizeSchedule(nextPayload.schedule);
  }

  return nextPayload;
};
