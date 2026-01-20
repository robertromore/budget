/**
 * Safe Parse Utilities
 *
 * Centralized error-safe parsing and fallback functions to reduce
 * repetitive try-catch blocks across the application.
 */

// ============================================================================
// Generic Safe Execution
// ============================================================================

/**
 * Execute a function safely with a fallback value
 * @example safeParse(() => JSON.parse(str), {}) => parsed object or {}
 */
export function safeParse<T>(fn: () => T, defaultValue: T): T {
  try {
    return fn();
  } catch {
    return defaultValue;
  }
}

/**
 * Execute an async function safely with a fallback value
 * @example await safeParseAsync(async () => fetch(url), null)
 */
export async function safeParseAsync<T>(
  fn: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await fn();
  } catch {
    return defaultValue;
  }
}

/**
 * Execute a function safely, returning result or error
 * @example const [result, error] = safeResult(() => riskyOperation())
 */
export function safeResult<T>(fn: () => T): [T, null] | [null, Error] {
  try {
    return [fn(), null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

/**
 * Execute an async function safely, returning result or error
 */
export async function safeResultAsync<T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, Error]> {
  try {
    return [await fn(), null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

// ============================================================================
// JSON Parsing
// ============================================================================

/**
 * Safely parse JSON with fallback value
 * @example safeJsonParse('{"a": 1}', {}) => { a: 1 }
 * @example safeJsonParse('invalid', {}) => {}
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely parse JSON, returning null on failure
 * @example safeJsonParseOrNull('{"a": 1}') => { a: 1 }
 * @example safeJsonParseOrNull('invalid') => null
 */
export function safeJsonParseOrNull<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Safely stringify to JSON with fallback
 * @example safeJsonStringify({ a: 1 }, '{}') => '{"a":1}'
 */
export function safeJsonStringify(value: unknown, defaultValue = ""): string {
  try {
    return JSON.stringify(value);
  } catch {
    return defaultValue;
  }
}

// ============================================================================
// Number Parsing
// ============================================================================

/**
 * Safely parse integer with fallback
 * @example safeParseInt('42', 0) => 42
 * @example safeParseInt('invalid', 0) => 0
 */
export function safeParseInt(value: string, defaultValue: number): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse float with fallback
 * @example safeParseFloat('3.14', 0) => 3.14
 * @example safeParseFloat('invalid', 0) => 0
 */
export function safeParseFloat(value: string, defaultValue: number): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Coerce any value to number with fallback
 * @example coerceToNumber('42') => 42
 * @example coerceToNumber(null, 0) => 0
 */
export function coerceToNumber(
  value: unknown,
  defaultValue: number = 0
): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "number") return isNaN(value) ? defaultValue : value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Coerce to integer
 * @example coerceToInt('42.9') => 42
 */
export function coerceToInt(value: unknown, defaultValue: number = 0): number {
  const num = coerceToNumber(value, defaultValue);
  return Math.trunc(num);
}

// ============================================================================
// Boolean Parsing
// ============================================================================

/**
 * Coerce value to boolean
 * Treats 'true', '1', 1 as true; 'false', '0', 0 as false
 * @example coerceToBoolean('true') => true
 * @example coerceToBoolean(1) => true
 * @example coerceToBoolean('false') => false
 */
export function coerceToBoolean(
  value: unknown,
  defaultValue: boolean = false
): boolean {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  return defaultValue;
}

// ============================================================================
// String Parsing
// ============================================================================

/**
 * Coerce value to string with fallback
 * @example coerceToString(42) => '42'
 * @example coerceToString(null, 'N/A') => 'N/A'
 */
export function coerceToString(
  value: unknown,
  defaultValue: string = ""
): string {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "string") return value;
  return String(value);
}

// ============================================================================
// Date Parsing
// ============================================================================

/**
 * Safely parse date with fallback
 * @example safeParseDateOrNull('2024-01-15') => Date
 * @example safeParseDateOrNull('invalid') => null
 */
export function safeParseDateOrNull(value: string | number): Date | null {
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Safely parse date with default
 * @example safeParseDate('2024-01-15', new Date()) => Date for 2024-01-15
 * @example safeParseDate('invalid', new Date()) => current date
 */
export function safeParseDate(
  value: string | number,
  defaultValue: Date
): Date {
  const parsed = safeParseDateOrNull(value);
  return parsed ?? defaultValue;
}

// ============================================================================
// Array Parsing
// ============================================================================

/**
 * Safely parse array from JSON
 * @example safeParseArray('[1,2,3]') => [1, 2, 3]
 * @example safeParseArray('invalid') => []
 */
export function safeParseArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Coerce value to array
 * @example coerceToArray([1, 2]) => [1, 2]
 * @example coerceToArray('a') => ['a']
 * @example coerceToArray(null) => []
 */
export function coerceToArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

// ============================================================================
// Null Coalescing
// ============================================================================

/**
 * Return first non-null/undefined value
 * @example coalesce(null, undefined, 'value') => 'value'
 */
export function coalesce<T>(...values: (T | null | undefined)[]): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return null;
}

/**
 * Return first truthy value (including handling empty strings and 0)
 * @example coalesceTruthy('', 0, 'value') => 'value'
 */
export function coalesceTruthy<T>(
  ...values: (T | null | undefined | "" | 0)[]
): T | null {
  for (const value of values) {
    if (value) {
      return value as T;
    }
  }
  return null;
}

// ============================================================================
// Type Checking with Default
// ============================================================================

/**
 * Get value if it's a string, otherwise return default
 * @example getStringOrDefault('hello', 'default') => 'hello'
 * @example getStringOrDefault(123, 'default') => 'default'
 */
export function getStringOrDefault(
  value: unknown,
  defaultValue: string
): string {
  return typeof value === "string" ? value : defaultValue;
}

/**
 * Get value if it's a number, otherwise return default
 * @example getNumberOrDefault(42, 0) => 42
 * @example getNumberOrDefault('hello', 0) => 0
 */
export function getNumberOrDefault(
  value: unknown,
  defaultValue: number
): number {
  return typeof value === "number" && !isNaN(value) ? value : defaultValue;
}

/**
 * Get value if it's an array, otherwise return default
 * @example getArrayOrDefault([1, 2], []) => [1, 2]
 * @example getArrayOrDefault('hello', []) => []
 */
export function getArrayOrDefault<T>(value: unknown, defaultValue: T[]): T[] {
  return Array.isArray(value) ? value : defaultValue;
}

/**
 * Get value if it's an object, otherwise return default
 * @example getObjectOrDefault({ a: 1 }, {}) => { a: 1 }
 * @example getObjectOrDefault('hello', {}) => {}
 */
export function getObjectOrDefault<T extends object>(
  value: unknown,
  defaultValue: T
): T {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as T)
    : defaultValue;
}

// ============================================================================
// Optional Chain Helpers
// ============================================================================

/**
 * Safely access nested property with fallback
 * @example safeGet(obj, o => o.deep.nested.value, 'default')
 */
export function safeGet<T, R>(
  obj: T,
  accessor: (obj: T) => R,
  defaultValue: R
): R {
  try {
    const value = accessor(obj);
    return value === undefined || value === null ? defaultValue : value;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely call a function on an object if it exists
 * @example safeCall(obj, o => o.method?.())
 */
export function safeCall<T, R>(
  obj: T,
  fn: (obj: T) => R | undefined
): R | undefined {
  try {
    return fn(obj);
  } catch {
    return undefined;
  }
}
