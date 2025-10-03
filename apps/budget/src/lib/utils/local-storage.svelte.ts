import {browser} from '$app/environment';

/**
 * Creates a reactive state that persists to localStorage
 * @param key - The localStorage key to use
 * @param defaultValue - The default value if nothing is stored
 * @returns An object with getter/setter for the value
 */
export function createLocalStorageState<T>(key: string, defaultValue: T) {
  let currentValue = $state(defaultValue);

  // Load from localStorage on initialization
  if (browser) {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        currentValue = JSON.parse(stored);
      }
    } catch (e) {
      console.warn(`Failed to load ${key} from localStorage:`, e);
    }
  }

  return {
    get value() {
      return currentValue;
    },
    set value(newValue: T) {
      currentValue = newValue;
      if (browser) {
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (e) {
          console.warn(`Failed to save ${key} to localStorage:`, e);
        }
      }
    }
  };
}