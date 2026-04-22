/**
 * Converts a number to its English word representation.
 * Supports the Indian numbering system (Thousands, Lakhs, Crores).
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

/**
 * Recursively converts an integer to English words (Indian system).
 * @param {number} n - Non-negative integer
 * @returns {string} English word representation
 */
function convertChunk(n) {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  }
  if (n < 1000) {
    return ONES[Math.floor(n / 100)] + ' Hundred' +
      (n % 100 ? ' and ' + convertChunk(n % 100) : '');
  }
  if (n < 100000) {
    return convertChunk(Math.floor(n / 1000)) + ' Thousand' +
      (n % 1000 ? ' ' + convertChunk(n % 1000) : '');
  }
  if (n < 10000000) {
    return convertChunk(Math.floor(n / 100000)) + ' Lakh' +
      (n % 100000 ? ' ' + convertChunk(n % 100000) : '');
  }
  return convertChunk(Math.floor(n / 10000000)) + ' Crore' +
    (n % 10000000 ? ' ' + convertChunk(n % 10000000) : '');
}

/**
 * Converts a number to its English word representation.
 * @param {number} n - The number to convert (non-negative integer)
 * @returns {string} English words
 */
export function numberToWords(n) {
  if (n === 0) return 'Zero';
  if (typeof n !== 'number' || n < 0) return 'Zero';
  return convertChunk(Math.floor(n)).trim();
}

/**
 * Converts a monetary amount to its full Indian Rupee representation.
 * @example amountToWords(4999) → "Four Thousand Nine Hundred and Ninety Nine Rupees Only"
 * @example amountToWords(1500.50) → "One Thousand Five Hundred Rupees and Fifty Paise Only"
 * @param {number} amount - The monetary amount
 * @returns {string} Full currency word representation
 */
export function amountToWords(amount) {
  if (typeof amount !== 'number' || amount <= 0) return 'Zero Rupees Only';

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = numberToWords(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + numberToWords(paise) + ' Paise';
  }
  result += ' Only';
  return result;
}
