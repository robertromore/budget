/**
 * A hook for easy use of number values
 *
 * ## Usage
 * ```svelte
 * <script lang="ts">
 *      const open = new UseNumber();
 * </script>
 */
export class UseNumber {
  #current = $state(0);

  constructor(defaultValue = 0) {
    this.#current = defaultValue;
  }

  get current() {
    return this.#current;
  }

  set current(val) {
    this.#current = val;
  }
}
