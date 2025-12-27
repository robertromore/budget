import { browser } from "$app/environment";

/**
 * Public routes where localStorage should not be persisted
 */
const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/invite"];

/**
 * Check if the current page is a public/auth route
 */
function isPublicRoute(): boolean {
  if (!browser) return false;
  return PUBLIC_ROUTES.some((route) => window.location.pathname.startsWith(route));
}

/**
 * Check if localStorage operations should be allowed
 * Returns false on public routes to avoid persisting settings for non-authenticated users
 */
export function shouldPersistToLocalStorage(): boolean {
  return browser && !isPublicRoute();
}

/**
 * Creates a reactive state that persists to localStorage
 * @param key - The localStorage key to use
 * @param defaultValue - The default value if nothing is stored
 * @returns An object with getter/setter for the value
 */
export function createLocalStorageState<T>(key: string, defaultValue: T) {
  let currentValue = $state(defaultValue);

  // Load from localStorage on initialization (only on non-public routes)
  if (shouldPersistToLocalStorage()) {
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
      if (shouldPersistToLocalStorage()) {
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (e) {
          console.warn(`Failed to save ${key} to localStorage:`, e);
        }
      }
    },
  };
}
