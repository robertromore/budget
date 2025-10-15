/**
 * Import Utility Functions
 *
 * Helper functions for data transformation, validation,
 * and normalization during the import process.
 */

import { ValidationError } from './errors';

/**
 * Normalize header names from various CSV formats
 */
export function normalizeHeader(header: string): string {
  const headerMap: Record<string, string> = {
    // Date variations
    'date': 'date',
    'trans date': 'date',
    'transaction date': 'date',
    'posted date': 'date',
    'posting date': 'date',
    'value date': 'date',

    // Amount variations
    'amount': 'amount',
    'transaction amount': 'amount',

    // Debit/Credit columns (keep separate to handle properly)
    'debit': 'debit',
    'credit': 'credit',

    // Transaction description column
    'transaction': 'transaction',

    // Description variations
    'description': 'description',
    'memo': 'memo',
    'narrative': 'description',
    'details': 'description',
    'transaction description': 'description',

    // Payee variations
    'payee': 'payee',
    'merchant': 'payee',
    'vendor': 'payee',
    'name': 'payee',

    // Category variations
    'category': 'category',
    'type': 'category',
    'classification': 'category',

    // Account variations
    'account': 'account',
    'account name': 'account',
    'account number': 'account',

    // Balance (ignored, for information only)
    'balance': 'balance',

    // Status variations
    'status': 'status',
    'cleared': 'status',
    'posted': 'status',

    // Check number
    'check number': 'checkNumber',
    'check #': 'checkNumber',
    'cheque number': 'checkNumber',
  };

  const normalized = header.toLowerCase().trim();
  return headerMap[normalized] || normalized;
}

/**
 * Parse date from various formats
 */
export function parseDate(dateString: string): string {
  if (!dateString || dateString.trim() === '') {
    throw new ValidationError('Date is required', 'date', dateString);
  }

  const cleaned = dateString.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return cleaned;
    }
  }

  // Try various date formats
  const formats = [
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY/MM/DD
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      const [, part1, part2, part3] = match;

      if (!part1 || !part2 || !part3) continue;

      // Determine if it's MM/DD/YYYY or DD/MM/YYYY
      // Heuristic: if first part > 12, it must be day
      const num1 = parseInt(part1, 10);
      const num2 = parseInt(part2, 10);
      const num3 = parseInt(part3, 10);

      let year: number, month: number, day: number;

      if (part3.length === 4) {
        // Part3 is year
        year = num3;
        if (num1 > 12) {
          // Must be DD/MM/YYYY
          day = num1;
          month = num2;
        } else if (num2 > 12) {
          // Must be MM/DD/YYYY
          month = num1;
          day = num2;
        } else {
          // Ambiguous - assume MM/DD/YYYY (US format)
          month = num1;
          day = num2;
        }
      } else if (part1.length === 4) {
        // Part1 is year (YYYY/MM/DD)
        year = num1;
        month = num2;
        day = num3;
      } else {
        continue;
      }

      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getMonth() === month - 1) {
        const isoDate = date.toISOString().split('T')[0];
        if (isoDate) return isoDate;
      }
    }
  }

  throw new ValidationError(`Invalid date format: ${dateString}`, 'date', dateString);
}

/**
 * Parse amount from various currency formats
 */
export function parseAmount(amountString: string | number): number {
  if (typeof amountString === 'number') {
    return amountString;
  }

  if (!amountString || amountString.toString().trim() === '') {
    throw new ValidationError('Amount is required', 'amount', amountString);
  }

  const cleaned = amountString
    .toString()
    .trim()
    // Remove currency symbols
    .replace(/[$£€¥₹₽¢₩]/g, '')
    // Remove thousands separators
    .replace(/,/g, '')
    // Remove spaces
    .replace(/\s+/g, '')
    // Handle parentheses as negative
    .replace(/^\((.*)\)$/, '-$1')
    // Handle CR/DR indicators
    .replace(/\s*(CR|DR)\s*$/i, '');

  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    throw new ValidationError(`Invalid amount: ${amountString}`, 'amount', amountString);
  }

  // Validate amount range
  if (amount < -999999.99 || amount > 999999.99) {
    throw new ValidationError(
      `Amount out of range: ${amount}`,
      'amount',
      amount
    );
  }

  return amount;
}

/**
 * Strip monetary amounts from payee names.
 * Removes common currency formats like:
 * - $123.45, £99.99, €50.00
 * - 123.45, 99.99 (standalone numbers with decimals)
 * - $1,234.56 (with thousand separators)
 * - (123.45) (negative amounts in parentheses)
 */
export function stripAmountsFromPayeeName(name: string): string {
  return name
    .trim()
    // Remove currency symbols followed by amounts
    .replace(/[$£€¥₹₽¢₩]\s*[\d,]+\.?\d*/g, '')
    // Remove standalone amounts with decimals (e.g., 123.45)
    .replace(/\b\d{1,3}(,\d{3})*\.\d{2}\b/g, '')
    // Remove amounts in parentheses
    .replace(/\(\s*[\d,]+\.?\d*\s*\)/g, '')
    // Remove trailing/leading amounts
    .replace(/^\s*[\d,]+\.?\d*\s*/g, '')
    .replace(/\s*[\d,]+\.?\d*\s*$/g, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize payee name
 */
export function normalizePayeeName(name: string): string {
  // First strip any amounts from the name
  const withoutAmounts = stripAmountsFromPayeeName(name);

  return withoutAmounts
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s&'\-]/g, '') // Remove special characters except &, ', -
    .toLowerCase();
}

/**
 * Capitalize payee name for display
 */
export function capitalizePayeeName(name: string): string {
  // First strip amounts
  const cleaned = stripAmountsFromPayeeName(name);

  return cleaned
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Calculate Levenshtein distance for string similarity
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) {
    const row = matrix[0];
    if (row) row[i] = i;
  }
  for (let j = 0; j <= str2.length; j++) {
    const row = matrix[j];
    if (row) row[0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const currentRow = matrix[j];
      const prevRow = matrix[j - 1];

      if (currentRow && prevRow) {
        currentRow[i] = Math.min(
          (currentRow[i - 1] ?? 0) + 1, // insertion
          (prevRow[i] ?? 0) + 1, // deletion
          (prevRow[i - 1] ?? 0) + cost // substitution
        );
      }
    }
  }

  const lastRow = matrix[str2.length];
  return lastRow?.[str1.length] ?? 0;
}

/**
 * Calculate string similarity (0-1 scale)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 && str2.length === 0) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const editDistance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return (maxLength - editDistance) / maxLength;
}

/**
 * Sanitize text input
 */
export function sanitizeText(text: string, maxLength = 500): string {
  return text
    .trim()
    .substring(0, maxLength)
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, ''); // Remove HTML tags
}

/**
 * Validate file type
 */
export function validateFileType(fileName: string, acceptedTypes: string[]): boolean {
  const extension = `.${fileName.split('.').pop()?.toLowerCase()}`;
  return acceptedTypes.includes(extension);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Detect delimiter in CSV text
 */
export function detectCSVDelimiter(text: string): string {
  const lines = text.split('\n').slice(0, 5); // Check first 5 lines
  const delimiters = [',', ';', '\t', '|'];

  const counts = delimiters.map(delimiter => ({
    delimiter,
    count: lines.reduce((sum, line) => sum + (line.split(delimiter).length - 1), 0),
  }));

  counts.sort((a, b) => b.count - a.count);
  return counts[0]?.delimiter ?? ',';
}

/**
 * Normalize text for matching (lowercase, remove extra whitespace)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a date string is valid YYYY-MM-DD format
 */
export function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
