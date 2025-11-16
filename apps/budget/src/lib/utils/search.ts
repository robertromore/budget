/**
 * Search and Filter Utilities
 * Shared utilities for search/filter functionality across entity pages
 */

/**
 * Highlights search query matches in text by wrapping them in <mark> tags
 * @param text - The text to search within
 * @param query - The search query to highlight
 * @returns HTML string with highlighted matches
 */
export function highlightMatches(text: string, query: string): string {
  if (!query || !text) return text;

  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  return text.replace(
    regex,
    '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-1">$1</mark>'
  );
}

/**
 * Counts the number of active filters in a filters object
 * Ignores undefined, null, and empty string values
 * @param filters - Object containing filter values
 * @returns Number of active filters
 */
export function countActiveFilters(filters: Record<string, any>): number {
  return Object.values(filters).filter(
    (value) => value !== undefined && value !== null && value !== ""
  ).length;
}

/**
 * Type guard to check if a filter value is considered "active"
 */
export function isActiveFilterValue(value: any): boolean {
  return value !== undefined && value !== null && value !== "";
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Formats a filter value for display in the UI
 * Handles booleans, arrays, and objects
 */
export function formatFilterValue(value: any): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Gets a human-readable label for a filter key
 * Converts camelCase to Title Case
 */
export function getFilterLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Extracts filter summaries for display
 * Returns an array of human-readable filter descriptions
 */
export function getFilterSummaries(
  filters: Record<string, any>,
  labelMap?: Record<string, string>
): string[] {
  const summaries: string[] = [];

  for (const [key, value] of Object.entries(filters)) {
    if (!isActiveFilterValue(value)) continue;

    const label = labelMap?.[key] || getFilterLabel(key);
    const formattedValue = formatFilterValue(value);

    summaries.push(`${label}: ${formattedValue}`);
  }

  return summaries;
}

/**
 * Clears specific filters from a filters object
 */
export function clearFilters<T extends Record<string, any>>(
  filters: T,
  keys: (keyof T)[]
): Partial<T> {
  const newFilters = { ...filters };

  for (const key of keys) {
    delete newFilters[key];
  }

  return newFilters;
}

/**
 * Merges new filters into existing filters
 * Removes filters with undefined/null values
 */
export function updateFilters<T extends Record<string, any>>(
  currentFilters: T,
  updates: Partial<T>
): T {
  const newFilters = { ...currentFilters };

  for (const [key, value] of Object.entries(updates)) {
    if (!isActiveFilterValue(value)) {
      delete newFilters[key as keyof T];
    } else {
      newFilters[key as keyof T] = value as T[keyof T];
    }
  }

  return newFilters;
}
