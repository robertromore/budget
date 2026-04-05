/**
 * Creates a lazy proxy around a service factory function.
 * This avoids constructing repositories during module evaluation,
 * which prevents build-time import-cycle initialization errors.
 */
export function lazyService<T extends object>(getService: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const service = getService();
      const value = Reflect.get(service, prop);
      return typeof value === "function" ? value.bind(service) : value;
    },
  });
}
