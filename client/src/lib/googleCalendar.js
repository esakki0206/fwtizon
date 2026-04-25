/**
 * Google Calendar URL utility for live course class scheduling.
 *
 * Generates a "Add to Google Calendar" URL that pre-fills an event
 * with the live course details. No OAuth or backend secrets required —
 * the user simply clicks a link and saves the event to their own calendar.
 *
 * Timezone: All times are treated as Asia/Kolkata (IST) by default.
 */

/**
 * Pad a number to 2 digits.
 * @param {number} n
 * @returns {string}
 */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Convert a Date object to the Google Calendar date-time format (YYYYMMDDTHHmmss).
 * @param {Date} date
 * @returns {string}
 */
const toGCalDateTime = (date) => {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}${m}${d}T${h}${min}${s}`;
};

/**
 * Parse "HH:MM" string into { hours, minutes }.
 * Returns { hours: 0, minutes: 0 } if the string is invalid.
 * @param {string} timeStr
 * @returns {{ hours: number, minutes: number }}
 */
const parseTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return { hours: 0, minutes: 0 };
  const parts = timeStr.split(':');
  return {
    hours: parseInt(parts[0], 10) || 0,
    minutes: parseInt(parts[1], 10) || 0,
  };
};

/**
 * Build a Google Calendar "Add Event" URL for a live course class.
 *
 * @param {object} course  — LiveCourse object from the API
 * @param {string} course.title
 * @param {string} [course.description]
 * @param {string|Date} course.startDate       — ISO date string or Date
 * @param {string} [course.classStartTime]     — "HH:MM" format
 * @param {string} [course.classEndTime]       — "HH:MM" format
 * @param {string} [course.instructorName]
 * @param {string} [course.duration]
 * @param {string} [course.timezone]           — default "Asia/Kolkata"
 *
 * @returns {string}  Full Google Calendar URL ready for navigation
 */
export const buildGoogleCalendarUrl = (course) => {
  if (!course) return '';

  const timezone = course.timezone || 'Asia/Kolkata';
  const courseDate = course.startDate ? new Date(course.startDate) : new Date();

  // ── Start DateTime ──────────────────────────────────────────────────────────
  let startHours = 9;   // default 9 AM
  let startMinutes = 0;

  if (course.classStartTime) {
    const parsed = parseTime(course.classStartTime);
    startHours = parsed.hours;
    startMinutes = parsed.minutes;
  }

  const startDt = new Date(
    courseDate.getFullYear(),
    courseDate.getMonth(),
    courseDate.getDate(),
    startHours,
    startMinutes,
    0,
  );

  // ── End DateTime ────────────────────────────────────────────────────────────
  let endDt;

  if (course.classEndTime) {
    const parsed = parseTime(course.classEndTime);
    endDt = new Date(
      courseDate.getFullYear(),
      courseDate.getMonth(),
      courseDate.getDate(),
      parsed.hours,
      parsed.minutes,
      0,
    );
  } else {
    // Default: 1 hour after start
    endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
  }

  // ── Event Details ───────────────────────────────────────────────────────────
  const instructorLine = course.instructorName
    ? `Instructor: ${course.instructorName}`
    : '';

  const durationLine = course.duration
    ? `Duration: ${course.duration}`
    : '';

  const descriptionParts = [
    course.description || `Live class for ${course.title}`,
    '',
    instructorLine,
    durationLine,
    '',
    '📚 Fwtizon Academy — Live Cohort',
  ].filter((line, i, arr) => {
    // Remove consecutive empty lines
    if (line === '' && arr[i - 1] === '') return false;
    return true;
  });

  const description = descriptionParts.join('\n').trim();

  // ── Build URL ───────────────────────────────────────────────────────────────
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: course.title,
    dates: `${toGCalDateTime(startDt)}/${toGCalDateTime(endDt)}`,
    details: description,
    ctz: timezone,
    // Remind 30 min and 1 day before
    // (Google Calendar URL doesn't support reminders directly,
    // but setting the ctz param ensures correct timezone display)
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Open the Google Calendar add-event page in a new browser tab.
 * @param {object} course
 */
export const addToGoogleCalendar = (course) => {
  const url = buildGoogleCalendarUrl(course);
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};
