/**
 * Array Utilities
 *
 * Centralized array manipulation functions for consistent data processing
 * across the application.
 */

/**
 * Group array items by a key function
 * @example groupBy([{type: 'a', val: 1}, {type: 'a', val: 2}, {type: 'b', val: 3}], x => x.type)
 *          => { a: [{type: 'a', val: 1}, {type: 'a', val: 2}], b: [{type: 'b', val: 3}] }
 */
export function groupBy<T, K extends string | number | symbol>(
  arr: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return arr.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

/**
 * Group array items and transform each group
 * @example groupByAndMap(items, x => x.category, group => group.length)
 *          => { categoryA: 5, categoryB: 3 }
 */
export function groupByAndMap<T, K extends string | number | symbol, V>(
  arr: T[],
  keyFn: (item: T) => K,
  mapFn: (group: T[], key: K) => V
): Record<K, V> {
  const grouped = groupBy(arr, keyFn);
  const result = {} as Record<K, V>;
  for (const key in grouped) {
    result[key] = mapFn(grouped[key], key);
  }
  return result;
}

/**
 * Get unique items by a key function
 * @example uniqueBy([{id: 1, name: 'a'}, {id: 1, name: 'b'}, {id: 2, name: 'c'}], x => x.id)
 *          => [{id: 1, name: 'a'}, {id: 2, name: 'c'}]
 */
export function uniqueBy<T>(arr: T[], keyFn: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Get unique primitive values from array
 * @example unique([1, 2, 2, 3, 3, 3]) => [1, 2, 3]
 */
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Sum numeric values in array
 * @example sum([1, 2, 3, 4, 5]) => 15
 */
export function sum(arr: number[]): number {
  return arr.reduce((acc, val) => acc + val, 0);
}

/**
 * Sum values from array items using a value function
 * @example sumBy([{amount: 10}, {amount: 20}], x => x.amount) => 30
 */
export function sumBy<T>(arr: T[], valueFn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + valueFn(item), 0);
}

/**
 * Calculate average of numeric values
 * @example average([1, 2, 3, 4, 5]) => 3
 */
export function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

/**
 * Calculate average from array items using a value function
 * @example averageBy([{score: 10}, {score: 20}], x => x.score) => 15
 */
export function averageBy<T>(arr: T[], valueFn: (item: T) => number): number {
  if (arr.length === 0) return 0;
  return sumBy(arr, valueFn) / arr.length;
}

/**
 * Get minimum value from array
 * @example min([3, 1, 4, 1, 5]) => 1
 */
export function min(arr: number[]): number | undefined {
  if (arr.length === 0) return undefined;
  return Math.min(...arr);
}

/**
 * Get minimum value from array items using a value function
 * @example minBy([{val: 3}, {val: 1}, {val: 4}], x => x.val) => {val: 1}
 */
export function minBy<T>(arr: T[], valueFn: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce((min, item) =>
    valueFn(item) < valueFn(min) ? item : min
  );
}

/**
 * Get maximum value from array
 * @example max([3, 1, 4, 1, 5]) => 5
 */
export function max(arr: number[]): number | undefined {
  if (arr.length === 0) return undefined;
  return Math.max(...arr);
}

/**
 * Get maximum value from array items using a value function
 * @example maxBy([{val: 3}, {val: 1}, {val: 4}], x => x.val) => {val: 4}
 */
export function maxBy<T>(arr: T[], valueFn: (item: T) => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce((max, item) =>
    valueFn(item) > valueFn(max) ? item : max
  );
}

/**
 * Partition array into two arrays based on predicate
 * @example partition([1, 2, 3, 4, 5], x => x % 2 === 0) => [[2, 4], [1, 3, 5]]
 */
export function partition<T>(
  arr: T[],
  predicate: (item: T) => boolean
): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const item of arr) {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  }
  return [pass, fail];
}

/**
 * Chunk array into smaller arrays of specified size
 * @example chunk([1, 2, 3, 4, 5], 2) => [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten nested arrays one level deep
 * @example flatten([[1, 2], [3, 4], [5]]) => [1, 2, 3, 4, 5]
 */
export function flatten<T>(arr: T[][]): T[] {
  return arr.flat();
}

/**
 * Flatten and map in one operation
 * @example flatMap([1, 2, 3], x => [x, x * 2]) => [1, 2, 2, 4, 3, 6]
 */
export function flatMap<T, U>(arr: T[], fn: (item: T) => U[]): U[] {
  return arr.flatMap(fn);
}

/**
 * Sort array by a key function (returns new array)
 * @example sortBy([{name: 'c'}, {name: 'a'}, {name: 'b'}], x => x.name)
 *          => [{name: 'a'}, {name: 'b'}, {name: 'c'}]
 */
export function sortBy<T>(arr: T[], keyFn: (item: T) => string | number): T[] {
  return [...arr].sort((a, b) => {
    const aKey = keyFn(a);
    const bKey = keyFn(b);
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });
}

/**
 * Sort array by a key function in descending order (returns new array)
 * @example sortByDesc([{val: 1}, {val: 3}, {val: 2}], x => x.val)
 *          => [{val: 3}, {val: 2}, {val: 1}]
 */
export function sortByDesc<T>(
  arr: T[],
  keyFn: (item: T) => string | number
): T[] {
  return [...arr].sort((a, b) => {
    const aKey = keyFn(a);
    const bKey = keyFn(b);
    if (aKey > bKey) return -1;
    if (aKey < bKey) return 1;
    return 0;
  });
}

/**
 * Get first N items from array
 * @example take([1, 2, 3, 4, 5], 3) => [1, 2, 3]
 */
export function take<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

/**
 * Get last N items from array
 * @example takeLast([1, 2, 3, 4, 5], 3) => [3, 4, 5]
 */
export function takeLast<T>(arr: T[], n: number): T[] {
  return arr.slice(-n);
}

/**
 * Skip first N items from array
 * @example skip([1, 2, 3, 4, 5], 2) => [3, 4, 5]
 */
export function skip<T>(arr: T[], n: number): T[] {
  return arr.slice(n);
}

/**
 * Find first item matching predicate or return default
 * @example findOr([1, 2, 3], x => x > 5, 0) => 0
 */
export function findOr<T>(
  arr: T[],
  predicate: (item: T) => boolean,
  defaultValue: T
): T {
  return arr.find(predicate) ?? defaultValue;
}

/**
 * Check if array is empty
 * @example isEmpty([]) => true
 * @example isEmpty([1]) => false
 */
export function isEmpty<T>(arr: T[]): boolean {
  return arr.length === 0;
}

/**
 * Check if array is not empty
 * @example isNotEmpty([1]) => true
 * @example isNotEmpty([]) => false
 */
export function isNotEmpty<T>(arr: T[]): boolean {
  return arr.length > 0;
}

/**
 * Get first item or undefined
 * @example first([1, 2, 3]) => 1
 */
export function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

/**
 * Get last item or undefined
 * @example last([1, 2, 3]) => 3
 */
export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

/**
 * Count items matching predicate
 * @example countWhere([1, 2, 3, 4, 5], x => x % 2 === 0) => 2
 */
export function countWhere<T>(arr: T[], predicate: (item: T) => boolean): number {
  return arr.filter(predicate).length;
}

/**
 * Map and filter in one operation (removes null/undefined results)
 * @example mapAndFilter([1, 2, 3], x => x > 1 ? x * 2 : null) => [4, 6]
 */
export function mapAndFilter<T, U>(
  arr: T[],
  fn: (item: T) => U | null | undefined
): U[] {
  const result: U[] = [];
  for (const item of arr) {
    const mapped = fn(item);
    if (mapped !== null && mapped !== undefined) {
      result.push(mapped);
    }
  }
  return result;
}

/**
 * Remove null and undefined values from array.
 * Type-safe alternative to .filter(Boolean) that preserves falsy values like 0, '', false.
 * @example compact([1, null, 2, undefined, 3]) => [1, 2, 3]
 * @example compact([0, null, '', false, undefined]) => [0, '', false]
 */
export function compact<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter((item): item is T => item != null);
}

/**
 * Create a lookup map from array
 * @example keyBy([{id: 1, name: 'a'}, {id: 2, name: 'b'}], x => x.id)
 *          => Map { 1 => {id: 1, name: 'a'}, 2 => {id: 2, name: 'b'} }
 */
export function keyBy<T, K>(arr: T[], keyFn: (item: T) => K): Map<K, T> {
  const map = new Map<K, T>();
  for (const item of arr) {
    map.set(keyFn(item), item);
  }
  return map;
}

/**
 * Create a record/object lookup from array
 * @example indexBy([{id: 1, name: 'a'}, {id: 2, name: 'b'}], x => x.id)
 *          => { 1: {id: 1, name: 'a'}, 2: {id: 2, name: 'b'} }
 */
export function indexBy<T, K extends string | number | symbol>(
  arr: T[],
  keyFn: (item: T) => K
): Record<K, T> {
  return arr.reduce(
    (acc, item) => {
      acc[keyFn(item)] = item;
      return acc;
    },
    {} as Record<K, T>
  );
}

/**
 * Zip two arrays together
 * @example zip([1, 2, 3], ['a', 'b', 'c']) => [[1, 'a'], [2, 'b'], [3, 'c']]
 */
export function zip<T, U>(arr1: T[], arr2: U[]): [T, U][] {
  const length = Math.min(arr1.length, arr2.length);
  const result: [T, U][] = [];
  for (let i = 0; i < length; i++) {
    result.push([arr1[i], arr2[i]]);
  }
  return result;
}

/**
 * Create array of numbers in range
 * @example range(1, 5) => [1, 2, 3, 4, 5]
 * @example range(0, 10, 2) => [0, 2, 4, 6, 8, 10]
 */
export function range(start: number, end: number, step = 1): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Get intersection of two arrays
 * @example intersection([1, 2, 3], [2, 3, 4]) => [2, 3]
 */
export function intersection<T>(arr1: T[], arr2: T[]): T[] {
  const set2 = new Set(arr2);
  return arr1.filter((item) => set2.has(item));
}

/**
 * Get difference of two arrays (items in arr1 not in arr2)
 * @example difference([1, 2, 3], [2, 3, 4]) => [1]
 */
export function difference<T>(arr1: T[], arr2: T[]): T[] {
  const set2 = new Set(arr2);
  return arr1.filter((item) => !set2.has(item));
}
