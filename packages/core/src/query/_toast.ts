/**
 * Platform-agnostic toast notification interface.
 *
 * The app initializes this at startup with its toast implementation
 * (e.g., svelte-sonner for SvelteKit).
 */

export interface ToastOptions {
  importance?: "critical" | "important" | "normal";
  [key: string]: unknown;
}

export interface ToastAdapter {
  success(message: string, options?: ToastOptions): void;
  error(message: string, options?: ToastOptions): void;
  info(message: string, options?: ToastOptions): void;
}

const noopToast: ToastAdapter = {
  success: () => {},
  error: () => {},
  info: () => {},
};

let toastImpl: ToastAdapter = noopToast;

export function setToastAdapter(adapter: ToastAdapter): void {
  toastImpl = adapter;
}

export const toast = {
  success: (message: string, options?: ToastOptions) => toastImpl.success(message, options),
  error: (message: string, options?: ToastOptions) => toastImpl.error(message, options),
  info: (message: string, options?: ToastOptions) => toastImpl.info(message, options),
};
