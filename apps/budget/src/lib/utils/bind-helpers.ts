/**
 * Utilities for creating getter/setter pairs for Svelte 5 bind directives
 *
 * Svelte 5 allows binding with {get, set} pairs, which is useful for:
 * - Binding to computed values
 * - Binding to Record/Map values that might be undefined
 * - Adding transformation logic during get/set
 */

/**
 * Creates getter/setter accessors for a Record field
 * Ensures the value is always a string (never undefined)
 *
 * @example
 * ```svelte
 * let values = $state<Record<string, string>>({});
 * const accessors = createRecordAccessors(values, 'myKey');
 *
 * <Select.Root bind:value={accessors.get, accessors.set}>
 * ```
 */
export function createRecordAccessors(
  record: Record<string, string>,
  key: string,
  defaultValue: string = ''
) {
  return {
    get: () => record[key] ?? defaultValue,
    set: (value: string) => { record[key] = value; }
  };
}

/**
 * Creates getter/setter accessors for a Map entry
 * Ensures the value is always defined
 *
 * @example
 * ```svelte
 * let myMap = $state(new Map<string, number>());
 * const accessors = createMapAccessors(myMap, 'myKey', 0);
 *
 * <Input bind:value={accessors.get, accessors.set}>
 * ```
 */
export function createMapAccessors<K, V>(
  map: Map<K, V>,
  key: K,
  defaultValue: V
) {
  return {
    get: () => map.get(key) ?? defaultValue,
    set: (value: V) => { map.set(key, value); }
  };
}

/**
 * Creates getter/setter accessors for a Record with number keys and number values
 * Ensures the value is always a number (never undefined)
 *
 * @example
 * ```svelte
 * let allocations = $state<Record<number, number>>({});
 * const accessors = createNumericRecordAccessors(allocations, envelopeId, 0);
 *
 * <NumericInput bind:value={accessors.get, accessors.set}>
 * ```
 */
export function createNumericRecordAccessors(
  record: Record<number, number>,
  key: number,
  defaultValue: number = 0
) {
  return {
    get: () => record[key] ?? defaultValue,
    set: (value: number) => { record[key] = value; }
  };
}

/**
 * Creates getter/setter accessors with custom transformation logic
 * Useful when you need to transform values during get/set
 *
 * @example
 * ```svelte
 * let numberAsString = $state('0');
 * const accessors = createTransformAccessors(
 *   () => parseInt(numberAsString, 10),
 *   (n: number) => { numberAsString = n.toString(); }
 * );
 *
 * <NumberInput bind:value={accessors.get, accessors.set}>
 * ```
 */
export function createTransformAccessors<T>(
  getter: () => T,
  setter: (value: T) => void
) {
  return {
    get: getter,
    set: setter
  };
}
