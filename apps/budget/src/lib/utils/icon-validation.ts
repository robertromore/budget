// Icon validation utilities for server-side use
// Separate from UI components to avoid import issues during database generation

export const VALID_ICON_NAMES = [
  // Finance & Banking
  "credit-card",
  "piggy-bank",
  "landmark",
  "wallet",
  "banknote",
  "receipt",
  "trending-up",
  "trending-down",
  "dollar-sign",
  "euro",
  "pound-sterling",

  // Transportation
  "car",
  "plane",
  "train",
  "bus",
  "bike",
  "fuel",

  // Food & Dining
  "coffee",
  "utensils-crossed",
  "pizza",
  "shopping-cart",
  "apple",

  // Entertainment & Lifestyle
  "gamepad-2",
  "music",
  "film",
  "camera",
  "book",
  "dumbbell",
  "shirt",

  // Home & Utilities
  "home",
  "lightbulb",
  "wifi",
  "phone",
  "tv",
  "wrench",

  // Business & Work
  "building",
  "briefcase",
  "laptop",
  "pen-tool",
  "file-text",
  "users",

  // Health & Medical
  "heart",
  "heart-pulse",
  "pill",
  "stethoscope",
  "cross",

  // General
  "star",
  "gift",
  "calendar",
  "map-pin",
  "settings",
  "tag",
  "archive",
  "folder",
  "package",
  "globe",
] as const;

export function isValidIconName(iconName: string): boolean {
  return VALID_ICON_NAMES.includes(iconName as any);
}

export type ValidIconName = (typeof VALID_ICON_NAMES)[number];
