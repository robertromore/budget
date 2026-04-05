/**
 * Sequence generator for creating unique values in factories
 *
 * This utility ensures that generated values (like slugs, emails, names) are unique
 * across factory runs, preventing duplicate key violations.
 */

const sequences = new Map<string, number>();

/**
 * Gets the next value in a named sequence
 *
 * @param name - The sequence identifier (e.g., 'account', 'category', 'payee')
 * @returns number - The next sequential value
 *
 * @example
 * ```typescript
 * const slug = `${slugify(name)}-${sequence('account')}`;
 * // Results in: "checking-account-1", "checking-account-2", etc.
 * ```
 */
export function sequence(name: string): number {
  const current = sequences.get(name) || 0;
  const next = current + 1;
  sequences.set(name, next);
  return next;
}

/**
 * Resets a specific sequence back to 0
 *
 * @param name - The sequence identifier to reset
 *
 * @example
 * ```typescript
 * resetSequence('account'); // Next sequence('account') returns 1
 * ```
 */
export function resetSequence(name: string): void {
  sequences.set(name, 0);
}

/**
 * Resets all sequences back to 0
 *
 * Useful for test isolation - call at the start of each test suite
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetAllSequences();
 * });
 * ```
 */
export function resetAllSequences(): void {
  sequences.clear();
}

/**
 * Gets the current value of a sequence without incrementing
 *
 * @param name - The sequence identifier
 * @returns number - The current value (0 if sequence doesn't exist)
 */
export function getCurrentSequence(name: string): number {
  return sequences.get(name) || 0;
}
