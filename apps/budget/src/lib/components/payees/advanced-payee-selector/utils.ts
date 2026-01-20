import type { Payee, PaymentFrequency } from "$lib/schema/payees";
import { formatTimeAgo } from "$lib/utils/dates";
import { debounce } from "$lib/utils/search";
import type { GroupStrategy, PayeeGroup, PayeeWithMetadata } from "./types";

export { debounce };

// Frequency ranking for sorting (higher = more frequent)
const frequencyRank: Record<PaymentFrequency, number> = {
  weekly: 6,
  bi_weekly: 5,
  monthly: 4,
  quarterly: 3,
  annual: 2,
  irregular: 1,
  one_time: 0,
};

// High frequency thresholds (weekly or bi-weekly)
const highFrequencies: PaymentFrequency[] = ["weekly", "bi_weekly"];

/**
 * Group payees by the specified strategy
 */
export function groupPayees(
  payees: Payee[],
  strategy: GroupStrategy,
  payeeCategoryMap?: Map<number, string>
): PayeeGroup[] {
  if (strategy === "none") {
    return [
      {
        label: "All Payees",
        payees,
        count: payees.length,
        isExpanded: true,
      },
    ];
  }

  if (strategy === "type") {
    return groupByType(payees);
  }

  if (strategy === "category") {
    return groupByPayeeCategory(payees, payeeCategoryMap);
  }

  if (strategy === "alphabetical") {
    return groupByAlphabet(payees);
  }

  if (strategy === "usage") {
    return groupByUsage(payees);
  }

  // Default to none
  return [
    {
      label: "All Payees",
      payees,
      count: payees.length,
      isExpanded: true,
    },
  ];
}

/**
 * Group payees by type (Merchant, Utility, etc.)
 */
function groupByType(payees: Payee[]): PayeeGroup[] {
  const grouped = new Map<string, Payee[]>();

  for (const payee of payees) {
    const type = payee.payeeType || "other";
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(payee);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([type, payees]) => ({
      label: formatPayeeType(type),
      payees: sortPayeesByName(payees),
      count: payees.length,
      isExpanded: true,
    }));
}

/**
 * Group payees by payee category (UI organization)
 */
function groupByPayeeCategory(
  payees: Payee[],
  payeeCategoryMap?: Map<number, string>
): PayeeGroup[] {
  const grouped = new Map<string, Payee[]>();
  const uncategorized: Payee[] = [];

  for (const payee of payees) {
    if (!payee.payeeCategoryId) {
      uncategorized.push(payee);
      continue;
    }

    const categoryName =
      payeeCategoryMap?.get(payee.payeeCategoryId) || `Category ${payee.payeeCategoryId}`;
    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, []);
    }
    grouped.get(categoryName)!.push(payee);
  }

  const groups: PayeeGroup[] = Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, payees]) => ({
      label: category,
      payees: sortPayeesByName(payees),
      count: payees.length,
      isExpanded: true,
    }));

  // Add uncategorized group at the end if there are any
  if (uncategorized.length > 0) {
    groups.push({
      label: "Uncategorized",
      payees: sortPayeesByName(uncategorized),
      count: uncategorized.length,
      isExpanded: true,
    });
  }

  return groups;
}

/**
 * Group payees alphabetically (A-Z)
 */
function groupByAlphabet(payees: Payee[]): PayeeGroup[] {
  const grouped = new Map<string, Payee[]>();

  for (const payee of payees) {
    const firstLetter = (payee.name?.[0] || "#").toUpperCase();
    const key = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(payee);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => {
      if (a[0] === "#") return 1;
      if (b[0] === "#") return -1;
      return a[0].localeCompare(b[0]);
    })
    .map(([letter, payees]) => ({
      label: letter,
      payees: sortPayeesByName(payees),
      count: payees.length,
      isExpanded: true,
    }));
}

/**
 * Group payees by usage frequency
 */
function groupByUsage(payees: Payee[]): PayeeGroup[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const frequent: Payee[] = [];
  const recent: Payee[] = [];
  const occasional: Payee[] = [];
  const rare: Payee[] = [];

  for (const payee of payees) {
    const lastUsed = payee.lastTransactionDate ? new Date(payee.lastTransactionDate) : null;

    // Frequent: high payment frequency (weekly or bi-weekly)
    if (payee.paymentFrequency && highFrequencies.includes(payee.paymentFrequency)) {
      frequent.push(payee);
    }
    // Recent: used in last 30 days
    else if (lastUsed && lastUsed >= thirtyDaysAgo) {
      recent.push(payee);
    }
    // Occasional: used in last 90 days
    else if (lastUsed && lastUsed >= ninetyDaysAgo) {
      occasional.push(payee);
    }
    // Rare: everything else
    else {
      rare.push(payee);
    }
  }

  const groups: PayeeGroup[] = [];

  if (frequent.length > 0) {
    groups.push({
      label: "Frequent",
      payees: sortPayeesByName(frequent),
      count: frequent.length,
      isExpanded: true,
    });
  }

  if (recent.length > 0) {
    groups.push({
      label: "Recent",
      payees: sortPayeesByName(recent),
      count: recent.length,
      isExpanded: true,
    });
  }

  if (occasional.length > 0) {
    groups.push({
      label: "Occasional",
      payees: sortPayeesByName(occasional),
      count: occasional.length,
      isExpanded: false,
    });
  }

  if (rare.length > 0) {
    groups.push({
      label: "Rare",
      payees: sortPayeesByName(rare),
      count: rare.length,
      isExpanded: false,
    });
  }

  return groups;
}

/**
 * Sort payees by name alphabetically
 */
export function sortPayeesByName(payees: Payee[]): Payee[] {
  return [...payees].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

/**
 * Sort payees by relevance score (for search/ML results)
 */
export function sortPayeesByRelevance(payees: PayeeWithMetadata[]): PayeeWithMetadata[] {
  return [...payees].sort((a, b) => {
    // Prioritize suggested payees
    if (a._isSuggested && !b._isSuggested) return -1;
    if (!a._isSuggested && b._isSuggested) return 1;

    // Then by score
    const scoreA = a._score || 0;
    const scoreB = b._score || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    // Then by name
    return (a.name || "").localeCompare(b.name || "");
  });
}

/**
 * Format payee type for display
 */
export function formatPayeeType(type: string): string {
  const typeMap: Record<string, string> = {
    merchant: "Merchants",
    utility: "Utilities",
    employer: "Employers",
    financial_institution: "Financial Institutions",
    government: "Government",
    individual: "Individuals",
    other: "Other",
  };

  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Get recent payees from localStorage
 */
export function getRecentPayees(allPayees: Payee[], limit: number = 10): Payee[] {
  try {
    const recentIds = JSON.parse(localStorage.getItem("recentPayeeIds") || "[]") as number[];
    const payeeMap = new Map(allPayees.map((p) => [p.id, p]));

    return recentIds
      .map((id) => payeeMap.get(id))
      .filter((p): p is Payee => p !== undefined)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Save payee to recent list
 */
export function saveToRecentPayees(payeeId: number): void {
  try {
    const recentIds = JSON.parse(localStorage.getItem("recentPayeeIds") || "[]") as number[];

    // Remove if already exists
    const filtered = recentIds.filter((id) => id !== payeeId);

    // Add to front
    const updated = [payeeId, ...filtered].slice(0, 20); // Keep last 20

    localStorage.setItem("recentPayeeIds", JSON.stringify(updated));
  } catch {
    // Silently fail if localStorage unavailable
  }
}

/**
 * Get frequent payees (by payment frequency)
 */
export function getFrequentPayees(allPayees: Payee[], limit: number = 10): Payee[] {
  return [...allPayees]
    .filter((p) => p.paymentFrequency)
    .sort((a, b) => {
      const rankA = a.paymentFrequency ? frequencyRank[a.paymentFrequency] : 0;
      const rankB = b.paymentFrequency ? frequencyRank[b.paymentFrequency] : 0;
      return rankB - rankA;
    })
    .slice(0, limit);
}

/**
 * Format last used date for display
 */
export function formatLastUsed(dateString: string): string {
  return formatTimeAgo(new Date(dateString));
}
