/**
 * Payment Processor Filter Utility
 *
 * Provides functionality to detect and filter out payment processors and
 * vendor providers from payee names, helping users clean up bulk imports.
 */

export interface ProcessorPattern {
  name: string;
  patterns: RegExp[];
  description: string;
}

/**
 * Known payment processors and vendor providers
 * Each pattern should match the processor prefix and capture the merchant name
 */
export const PAYMENT_PROCESSORS: ProcessorPattern[] = [
  {
    name: "PayPal",
    patterns: [/^PayPal\s*[-*]\s*(.+)$/i, /^PAYPAL\s*\*?\s*(.+)$/i],
    description: "PayPal transactions",
  },
  {
    name: "Square",
    patterns: [/^SQ\s*\*\s*(.+)$/i, /^Square\s*[-*]\s*(.+)$/i],
    description: "Square payments",
  },
  {
    name: "Stripe",
    patterns: [/^STRIPE\s*[-*]\s*(.+)$/i],
    description: "Stripe payments",
  },
  {
    name: "Venmo",
    patterns: [/^Venmo\s*[-*]\s*(.+)$/i, /^VENMO\s+Payment\s+[-:]\s*(.+)$/i],
    description: "Venmo payments",
  },
  {
    name: "Zelle",
    patterns: [/^Zelle\s*[-*:]\s*(.+)$/i, /^ZELLE\s+Payment\s+[-:]\s*(.+)$/i],
    description: "Zelle transfers",
  },
  {
    name: "Cash App",
    patterns: [/^Cash\s*App\s*[-*]\s*(.+)$/i, /^CASH\s*APP\s*\*?\s*(.+)$/i],
    description: "Cash App payments",
  },
  {
    name: "Amazon",
    patterns: [
      /^Amazon(?:\s+(?:MKTPL?|Marketplace))?\s*[-*]\s*(.+)$/i,
      /^AMZN\s+(?:MKTPL?|Marketplace)\s*[-*]?\s*(.+)$/i,
    ],
    description: "Amazon Marketplace sellers",
  },
  {
    name: "eBay",
    patterns: [/^eBay\s*[-*]\s*(.+)$/i, /^EBAY\s+(?:O|Purchase)\s*[-:]?\s*(.+)$/i],
    description: "eBay sellers",
  },
  {
    name: "Etsy",
    patterns: [/^Etsy\.com\s*[-*]\s*(.+)$/i, /^ETSY\s+(?:COM)?\s*[-*]?\s*(.+)$/i],
    description: "Etsy sellers",
  },
  {
    name: "Shopify",
    patterns: [/^Shopify\s*[-*]\s*(.+)$/i, /^SHOPIFY\s*\*?\s*(.+)$/i],
    description: "Shopify stores",
  },
  {
    name: "Apple Pay",
    patterns: [/^Apple\s*Pay\s*[-*]\s*(.+)$/i, /^APPLE\.COM\/BILL\s*[-*]?\s*(.+)$/i],
    description: "Apple Pay transactions",
  },
  {
    name: "Google Pay",
    patterns: [/^Google\s*Pay\s*[-*]\s*(.+)$/i, /^GOOGLE\s*\*?\s*(.+)$/i],
    description: "Google Pay transactions",
  },
];

export interface ProcessorDetection {
  processor: string;
  merchantName: string;
  originalName: string;
  pattern: RegExp;
}

/**
 * Detect payment processor in a payee name
 */
export function detectPaymentProcessor(payeeName: string): ProcessorDetection | null {
  if (!payeeName || !payeeName.trim()) {
    return null;
  }

  for (const processor of PAYMENT_PROCESSORS) {
    for (const pattern of processor.patterns) {
      const match = payeeName.match(pattern);
      if (match && match[1]) {
        return {
          processor: processor.name,
          merchantName: match[1].trim(),
          originalName: payeeName,
          pattern,
        };
      }
    }
  }

  return null;
}

/**
 * Filter out payment processor prefix and return just the merchant name
 */
export function filterPaymentProcessor(payeeName: string): string {
  const detection = detectPaymentProcessor(payeeName);
  if (detection) {
    return detection.merchantName;
  }
  return payeeName;
}

/**
 * Analyze a list of payee names and group by payment processor
 */
export function analyzePaymentProcessors(payeeNames: string[]): Map<string, ProcessorDetection[]> {
  const grouped = new Map<string, ProcessorDetection[]>();

  for (const payeeName of payeeNames) {
    const detection = detectPaymentProcessor(payeeName);
    if (detection) {
      const existing = grouped.get(detection.processor) || [];
      existing.push(detection);
      grouped.set(detection.processor, existing);
    }
  }

  return grouped;
}

/**
 * Get count of payee names that contain payment processors
 */
export function countProcessorTransactions(payeeNames: string[]): {
  total: number;
  byProcessor: Map<string, number>;
} {
  const byProcessor = new Map<string, number>();
  let total = 0;

  for (const payeeName of payeeNames) {
    const detection = detectPaymentProcessor(payeeName);
    if (detection) {
      total++;
      const count = byProcessor.get(detection.processor) || 0;
      byProcessor.set(detection.processor, count + 1);
    }
  }

  return {total, byProcessor};
}
