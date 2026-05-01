const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'could',
  'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'i', 'in', 'is', 'it',
  'its', 'me', 'my', 'of', 'on', 'or', 'our', 'so', 'that', 'the', 'their', 'this',
  'to', 'too', 'was', 'we', 'were', 'with', 'you', 'your', 'course', 'class',
  'lesson', 'student', 'students', 'teacher', 'sir', 'madam', 'very',
]);

const POSITIVE_KEYWORDS = new Set([
  'amazing', 'best', 'clear', 'excellent', 'good', 'great', 'helpful', 'interesting',
  'learned', 'love', 'perfect', 'practical', 'useful', 'valuable', 'wonderful',
  'easy', 'understand', 'clarity', 'supportive', 'knowledgeable', 'engaging',
]);

const NEGATIVE_KEYWORDS = new Set([
  'bad', 'boring', 'confusing', 'delay', 'difficult', 'hard', 'issue', 'late',
  'missing', 'problem', 'poor', 'slow', 'stuck', 'unclear', 'wrong', 'error',
  'loading', 'payment', 'refund', 'timing',
]);

const ISSUE_PATTERNS = [
  {
    label: 'Payment issue',
    phrases: ['payment issue', 'payment problem', 'payment failed', 'refund', 'transaction', 'paid but', 'razorpay', 'upi'],
  },
  {
    label: 'Video not loading',
    phrases: ['video not loading', 'video issue', 'video problem', 'cannot play', 'not playing', 'buffering', 'loading issue'],
  },
  {
    label: 'Timing problem',
    phrases: ['timing problem', 'time issue', 'schedule issue', 'class timing', 'late class', 'time slot', 'reschedule'],
  },
  {
    label: 'Slow response',
    phrases: ['slow response', 'no response', 'late response', 'support delay', 'reply late'],
  },
  {
    label: 'Content clarity',
    phrases: ['not clear', 'unclear', 'confusing', 'hard to understand', 'difficult to understand'],
  },
];

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value = '') =>
  normalizeText(value)
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

const increment = (map, key, amount = 1) => {
  map.set(key, (map.get(key) || 0) + amount);
};

const toSortedCounts = (map, limit = 10) =>
  [...map.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword))
    .slice(0, limit);

const formatList = (items) => {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

const classifySentiment = (rating, comment) => {
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';

  const words = tokenize(comment);
  const positiveCount = words.filter((word) => POSITIVE_KEYWORDS.has(word)).length;
  const negativeCount = words.filter((word) => NEGATIVE_KEYWORDS.has(word)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
};

export const buildFeedbackInsights = (reviews = []) => {
  const commonKeywords = new Map();
  const positiveKeywords = new Map();
  const negativeKeywords = new Map();
  const issueCounts = new Map();
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };

  for (const review of reviews) {
    const comment = review.comment || '';
    const normalizedComment = normalizeText(comment);
    const sentiment = classifySentiment(Number(review.rating) || 0, comment);
    sentimentCounts[sentiment] += 1;

    for (const word of tokenize(comment)) {
      increment(commonKeywords, word);
      if (sentiment === 'positive' && POSITIVE_KEYWORDS.has(word)) increment(positiveKeywords, word);
      if (sentiment === 'negative' && NEGATIVE_KEYWORDS.has(word)) increment(negativeKeywords, word);
    }

    for (const issue of ISSUE_PATTERNS) {
      if (issue.phrases.some((phrase) => normalizedComment.includes(phrase))) {
        increment(issueCounts, issue.label);
      }
    }
  }

  const topStrengths = toSortedCounts(positiveKeywords, 6);
  const topIssues = toSortedCounts(issueCounts, 3).map(({ keyword, count }) => ({ label: keyword, count }));
  const topNegativeKeywords = toSortedCounts(negativeKeywords, 3);

  const insights = [];
  if (topStrengths.length) {
    insights.push(`Most students liked ${formatList(topStrengths.slice(0, 3).map((item) => item.keyword))}.`);
  }
  if (topIssues.length) {
    insights.push(`Frequent complaints mention ${formatList(topIssues.map((item) => item.label.toLowerCase()))}.`);
  } else if (topNegativeKeywords.length) {
    insights.push(`Some users mentioned ${formatList(topNegativeKeywords.map((item) => item.keyword))}.`);
  }
  if (!insights.length && reviews.length) {
    insights.push('Feedback is available, but there is not enough repeated language to identify a clear pattern yet.');
  }
  if (!reviews.length) {
    insights.push('No feedback matches the current filters.');
  }

  return {
    sentimentCounts,
    commonKeywords: toSortedCounts(commonKeywords, 12),
    topStrengths,
    topIssues,
    insights,
  };
};
