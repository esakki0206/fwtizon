const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

const TIMEZONE_LABELS = {
  'Asia/Kolkata': 'IST',
};

export const getTimeZoneLabel = (timezone) => {
  if (!timezone) return '';
  return TIMEZONE_LABELS[timezone] || timezone.split('/').pop()?.replace(/_/g, ' ') || timezone;
};

export const parseTimeValue = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') return null;
  const match = timeValue.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  };
};

const getCalendarDateParts = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const dateOnlyMatch = value.match(DATE_ONLY_PATTERN);
    if (dateOnlyMatch) {
      return {
        year: Number(dateOnlyMatch[1]),
        month: Number(dateOnlyMatch[2]),
        day: Number(dateOnlyMatch[3]),
      };
    }
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
};

const buildLocalDate = (parts, timeParts) => {
  if (!parts) return null;

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    timeParts?.hours ?? 0,
    timeParts?.minutes ?? 0,
    0,
    0,
  );
};

const getFallbackCourseTime = (course) => course?.classStartTime || course?.schedule?.find((slot) => slot?.time)?.time || '';

export const getLiveCourseSessionDate = (course) => {
  const sourceDate = course?.startDate || course?.createdAt;
  const parts = getCalendarDateParts(sourceDate);

  if (!parts) {
    const fallback = sourceDate ? new Date(sourceDate) : null;
    return fallback && !Number.isNaN(fallback.getTime()) ? fallback : null;
  }

  return buildLocalDate(parts, parseTimeValue(getFallbackCourseTime(course)));
};

export const getLiveCourseUpcomingTimestamp = (course) => {
  const sessionDate = getLiveCourseSessionDate(course);
  if (!sessionDate) return null;

  if (getFallbackCourseTime(course)) {
    return sessionDate.getTime();
  }

  const endOfDay = new Date(sessionDate);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime();
};

export const formatTimeValue = (timeValue, locale = 'en-IN') => {
  const parsed = parseTimeValue(timeValue);
  if (!parsed) return '';

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(2026, 0, 1, parsed.hours, parsed.minutes));
};

export const getLiveCourseTimingText = (course, locale = 'en-IN') => {
  const startTime = getFallbackCourseTime(course);
  const endTime = course?.classEndTime;
  if (!startTime) return '';

  const startLabel = formatTimeValue(startTime, locale);
  const endLabel = endTime ? formatTimeValue(endTime, locale) : '';
  const timezoneLabel = getTimeZoneLabel(course?.timezone);
  const timeRange = endLabel ? `${startLabel} - ${endLabel}` : startLabel;

  return timezoneLabel ? `${timeRange} ${timezoneLabel}` : timeRange;
};

export const formatLiveCourseDate = (course, locale = 'en-IN', options = {}) => {
  const sessionDate = getLiveCourseSessionDate(course);
  if (!sessionDate) return 'Date to be announced';

  return new Intl.DateTimeFormat(locale, {
    month: options.month || 'short',
    day: options.day || 'numeric',
    year: options.year || 'numeric',
    ...(options.weekday ? { weekday: options.weekday } : {}),
  }).format(sessionDate);
};

export const formatLiveCourseStartLabel = (course, options = {}) => {
  const locale = options.locale || 'en-IN';
  const dateLabel = formatLiveCourseDate(course, locale, {
    month: options.month,
    day: options.day,
    year: options.year,
    weekday: options.weekday,
  });
  const timeLabel = options.includeTime === false ? '' : getLiveCourseTimingText(course, locale);

  return timeLabel ? `${dateLabel} • ${timeLabel}` : dateLabel;
};
