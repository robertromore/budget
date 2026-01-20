/**
 * Object Utilities
 *
 * Type-safe object manipulation functions for consistent data handling
 * across the application.
 */

/**
 * Check if an object is empty (has no own enumerable properties).
 * @example isEmptyObject({}) => true
 * @example isEmptyObject({ a: 1 }) => false
 */
export function isEmptyObject<T extends object>(obj: T): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Check if an object is not empty.
 * @example isNotEmptyObject({ a: 1 }) => true
 * @example isNotEmptyObject({}) => false
 */
export function isNotEmptyObject<T extends object>(obj: T): boolean {
  return Object.keys(obj).length > 0;
}

/**
 * Get the number of keys in an object.
 * @example objectSize({ a: 1, b: 2 }) => 2
 */
export function objectSize(obj: Record<string, unknown>): number {
  return Object.keys(obj).length;
}

/**
 * Type-safe Object.keys that preserves key types.
 * @example objectKeys({ a: 1, b: 2 }) => ['a', 'b'] as ('a' | 'b')[]
 */
export function objectKeys<T extends Record<string, unknown>>(
  obj: T
): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Type-safe Object.values.
 * @example objectValues({ a: 1, b: 2 }) => [1, 2]
 */
export function objectValues<T extends Record<string, unknown>>(
  obj: T
): T[keyof T][] {
  return Object.values(obj) as T[keyof T][];
}

/**
 * Type-safe Object.entries.
 * @example objectEntries({ a: 1, b: 2 }) => [['a', 1], ['b', 2]]
 */
export function objectEntries<T extends Record<string, unknown>>(
  obj: T
): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Pick specified keys from an object.
 * @example pick({ a: 1, b: 2, c: 3 }, ['a', 'c']) => { a: 1, c: 3 }
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specified keys from an object.
 * @example omit({ a: 1, b: 2, c: 3 }, ['b']) => { a: 1, c: 3 }
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Create an object from key-value pairs.
 * @example fromEntries([['a', 1], ['b', 2]]) => { a: 1, b: 2 }
 */
export function fromEntries<K extends string, V>(
  entries: [K, V][]
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}

/**
 * Map over object values while preserving keys.
 * @example mapValues({ a: 1, b: 2 }, x => x * 2) => { a: 2, b: 4 }
 */
export function mapValues<T extends Record<string, unknown>, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U
): Record<keyof T, U> {
  const result = {} as Record<keyof T, U>;
  for (const key of objectKeys(obj)) {
    result[key] = fn(obj[key], key);
  }
  return result;
}

/**
 * Filter object entries based on predicate.
 * @example filterObject({ a: 1, b: 2, c: 3 }, v => v > 1) => { b: 2, c: 3 }
 */
export function filterObject<T extends Record<string, unknown>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean
): Partial<T> {
  const result = {} as Partial<T>;
  for (const key of objectKeys(obj)) {
    if (predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Deep clone an object (handles nested objects/arrays).
 * Note: Does not handle circular references, functions, or special objects like Date.
 * @example deepClone({ a: { b: 1 } }) => { a: { b: 1 } } (new reference)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Shallow merge multiple objects (later values override earlier).
 * @example merge({ a: 1 }, { b: 2 }, { a: 3 }) => { a: 3, b: 2 }
 */
export function merge<T extends Record<string, unknown>>(
  ...objects: Partial<T>[]
): T {
  return Object.assign({}, ...objects) as T;
}

/**
 * Check if a value is a plain object (not null, array, or other types).
 * @example isPlainObject({}) => true
 * @example isPlainObject([]) => false
 * @example isPlainObject(null) => false
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

/**
 * Get a value from an object by path (dot notation).
 * @example getPath({ a: { b: { c: 1 } } }, 'a.b.c') => 1
 * @example getPath({ a: 1 }, 'b.c', 'default') => 'default'
 */
export function getPath<T = unknown>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split(".");
  let result: unknown = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = (result as Record<string, unknown>)[key];
  }

  return (result as T) ?? defaultValue;
}

/**
 * Check if object has a specific own property.
 * Type-safe alternative to obj.hasOwnProperty(key).
 * @example hasOwn({ a: 1 }, 'a') => true
 * @example hasOwn({ a: 1 }, 'b') => false
 */
export function hasOwn<T extends Record<string, unknown>>(
  obj: T,
  key: string | number | symbol
): key is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
