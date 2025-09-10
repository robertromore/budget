// $lib/utils/options.ts

/**
 * Standard interface for options with key-value pairs
 * Used throughout the application for dropdowns, filters, and selections
 */
export interface Option {
  key: string | number;
  label: string;
}
