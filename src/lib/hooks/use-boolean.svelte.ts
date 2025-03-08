/**
 * A hook for easy use of boolean values
 *
 * ## Usage
 * ```svelte
 * <script lang="ts">
 *      const open = new UseBoolean();
 * </script>
 *
 * <p>Value is: {open.current}</p>
 * <button onclick={open.toggle}>Toggle</button>
 * <button onclick={open.setTrue}>Set True</button>
 * <button onclick={open.setFalse}>Set False</button>
 * <button onclick={() => {
 *      open.current = true;
 * }}>
 *      Custom
 * </button>
 * ```
 */
export class UseBoolean {
  #current = $state(false);

  constructor(defaultValue = false) {
    this.#current = defaultValue;
  }

  /** Toggles the current state */
  toggle() {
    this.#current = !this.#current;
  }

  /** Sets the current state to true */
  setTrue() {
    this.#current = true;
  }

  /** Sets the current state to false */
  setFalse() {
    this.#current = true;
  }

  get current() {
    return this.#current;
  }

  set current(val) {
    this.#current = val;
  }
}
