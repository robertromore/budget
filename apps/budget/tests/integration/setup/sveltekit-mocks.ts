import { mock } from "bun:test";

const dynamicEnv = new Proxy(process.env, {
  get(target, prop) {
    if (typeof prop === "string") {
      return target[prop];
    }
    return undefined;
  },
});

mock.module("$app/environment", () => ({
  browser: false,
  building: false,
  dev: process.env.NODE_ENV !== "production",
  version: "test",
}));

mock.module("$env/dynamic/private", () => ({
  env: dynamicEnv,
}));

mock.module("svelte-sonner", () => {
  const noop = () => "mock-toast";
  const toast = Object.assign(noop, {
    success: noop,
    error: noop,
    info: noop,
    warning: noop,
    loading: noop,
    dismiss: () => undefined,
    message: noop,
    custom: noop,
    promise: async <T>(value: Promise<T> | T) => Promise.resolve(value),
  });

  return {
    toast,
    Toaster: () => null,
  };
});

mock.module("$lib/stores/display-preferences.svelte", () => ({
  displayPreferences: {
    notificationMode: "toast",
    notificationVerbosity: "all",
    formatCurrency: (amount: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount),
    formatNumber: (value: number) => new Intl.NumberFormat("en-US").format(value),
    formatDate: (date: Date) =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date),
  },
}));

mock.module("$lib/stores/notifications.svelte", () => ({
  getNotificationStore: () => ({
    add: () => undefined,
  }),
}));
