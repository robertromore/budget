/**
 * Client-side utility functions for import operations
 */

/**
 * Parse currency value for display in preview
 * Strips currency symbols and formatting but doesn't validate
 */
export function parsePreviewAmount(value: any): string {
  if (!value) return '-';

  const cleaned = value
    .toString()
    .trim()
    .replace(/[$£€¥₹₽¢₩]/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) || num === 0 ? '-' : cleaned;
}

/**
 * Format amount with sign for preview display
 */
export function formatPreviewAmount(value: any, isDebit: boolean): string {
  const parsed = parsePreviewAmount(value);
  if (parsed === '-') return '-';

  return isDebit ? `-${parsed}` : `+${parsed}`;
}
