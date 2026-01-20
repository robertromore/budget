/**
 * String Utilities
 *
 * Centralized string manipulation functions for consistent text processing
 * across the application.
 */

/**
 * Normalize a string by lowercasing, trimming, and collapsing whitespace
 * @example normalize("  Hello   World  ") => "hello world"
 */
export function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Normalize a string for matching by removing special characters
 * Useful for payee/category matching where punctuation should be ignored
 * @example normalizeForMatching("Walmart #1234") => "walmart 1234"
 */
export function normalizeForMatching(str: string): string {
  return normalize(str).replace(/[^\w\s]/g, "");
}

/**
 * Normalize a string aggressively by removing all non-alphanumeric characters
 * Useful for fuzzy matching and deduplication
 * @example normalizeAggressive("WALMART Store #1234!") => "walmartstore1234"
 */
export function normalizeAggressive(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Convert string to Title Case
 * @example toTitleCase("hello world") => "Hello World"
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Convert string to kebab-case (URL-friendly)
 * @example toKebabCase("Hello World") => "hello-world"
 */
export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Convert string to camelCase
 * @example toCamelCase("hello world") => "helloWorld"
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
}

/**
 * Convert string to snake_case
 * @example toSnakeCase("Hello World") => "hello_world"
 */
export function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_");
}

/**
 * Truncate string to max length with ellipsis
 * @example truncate("Hello World", 8) => "Hello..."
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Truncate string in the middle, preserving start and end
 * @example truncateMiddle("Hello Beautiful World", 15) => "Hello...World"
 */
export function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  const charsToShow = maxLength - 3;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);
  return str.slice(0, frontChars) + "..." + str.slice(-backChars);
}

/**
 * Check if string contains another string (case-insensitive)
 * @example containsIgnoreCase("Hello World", "WORLD") => true
 */
export function containsIgnoreCase(str: string, search: string): boolean {
  return str.toLowerCase().includes(search.toLowerCase());
}

/**
 * Check if string starts with another string (case-insensitive)
 * @example startsWithIgnoreCase("Hello World", "HELLO") => true
 */
export function startsWithIgnoreCase(str: string, search: string): boolean {
  return str.toLowerCase().startsWith(search.toLowerCase());
}

/**
 * Extract initials from a name
 * @example getInitials("John Doe") => "JD"
 * @example getInitials("John") => "J"
 */
export function getInitials(name: string, maxInitials = 2): string {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, maxInitials)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Pluralize a word based on count
 * @example pluralize(1, "item") => "item"
 * @example pluralize(5, "item") => "items"
 * @example pluralize(5, "category", "categories") => "categories"
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  if (count === 1) return singular;
  return plural ?? singular + "s";
}

/**
 * Join array with proper grammar (commas and "and")
 * @example joinWithAnd(["a", "b", "c"]) => "a, b, and c"
 * @example joinWithAnd(["a", "b"]) => "a and b"
 */
export function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(" and ");
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
}

/**
 * Escape HTML special characters for safe display
 * @example escapeHtml("<script>") => "&lt;script&gt;"
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Strip HTML tags from string
 * @example stripHtml("<p>Hello</p>") => "Hello"
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Check if string is empty or only whitespace
 * @example isBlank("  ") => true
 * @example isBlank("hello") => false
 */
export function isBlank(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.trim().length === 0;
}

/**
 * Check if string is not empty and not only whitespace
 * @example isNotBlank("hello") => true
 * @example isNotBlank("  ") => false
 */
export function isNotBlank(str: string | null | undefined): str is string {
  return !isBlank(str);
}

/**
 * Remove accents/diacritics from string
 * @example removeAccents("café") => "cafe"
 */
export function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Generate a URL-safe slug from string
 * @example slugify("Hello World! 123") => "hello-world-123"
 */
export function slugify(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Capitalize first letter of string
 * @example capitalize("hello") => "Hello"
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Pad string to minimum length
 * @example padStart("5", 3, "0") => "005"
 */
export function padStart(
  str: string | number,
  length: number,
  char = " "
): string {
  return String(str).padStart(length, char);
}

/**
 * Pad string to minimum length (end)
 * @example padEnd("5", 3, "0") => "500"
 */
export function padEnd(
  str: string | number,
  length: number,
  char = " "
): string {
  return String(str).padEnd(length, char);
}
