/**
 * Theme preset configurations
 * Based on shadcn-svelte.com theme options
 */

export interface ThemePreset {
  name: string;
  label: string;
  colors: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "zinc",
    label: "Zinc",
    colors: {
      primary: "240 5.9% 10%",
      primaryForeground: "0 0% 98%",
      accent: "240 4.8% 95.9%",
      accentForeground: "240 5.9% 10%",
    },
  },
  {
    name: "slate",
    label: "Slate",
    colors: {
      primary: "215.4 16.3% 46.9%",
      primaryForeground: "210 40% 98%",
      accent: "210 40% 96.1%",
      accentForeground: "222.2 47.4% 11.2%",
    },
  },
  {
    name: "stone",
    label: "Stone",
    colors: {
      primary: "25 5.3% 44.7%",
      primaryForeground: "60 9.1% 97.8%",
      accent: "60 4.8% 95.9%",
      accentForeground: "24 9.8% 10%",
    },
  },
  {
    name: "gray",
    label: "Gray",
    colors: {
      primary: "220 8.9% 46.1%",
      primaryForeground: "210 20% 98%",
      accent: "220 14.3% 95.9%",
      accentForeground: "220.9 39.3% 11%",
    },
  },
  {
    name: "neutral",
    label: "Neutral",
    colors: {
      primary: "0 0% 45.1%",
      primaryForeground: "0 0% 98%",
      accent: "0 0% 96.1%",
      accentForeground: "0 0% 9%",
    },
  },
  {
    name: "red",
    label: "Red",
    colors: {
      primary: "0 72.2% 50.6%",
      primaryForeground: "0 85.7% 97.3%",
      accent: "0 100% 96.5%",
      accentForeground: "0 74% 42%",
    },
  },
  {
    name: "rose",
    label: "Rose",
    colors: {
      primary: "346.8 77.2% 49.8%",
      primaryForeground: "355.7 100% 97.3%",
      accent: "355.7 100% 96.7%",
      accentForeground: "343.4 79.7% 34.7%",
    },
  },
  {
    name: "orange",
    label: "Orange",
    colors: {
      primary: "24.6 95% 53.1%",
      primaryForeground: "33.3 100% 96.5%",
      accent: "33.3 100% 96.5%",
      accentForeground: "20.5 90.2% 48.2%",
    },
  },
  {
    name: "green",
    label: "Green",
    colors: {
      primary: "142.1 76.2% 36.3%",
      primaryForeground: "138.5 76.5% 96.7%",
      accent: "138.5 76.5% 96.7%",
      accentForeground: "140.6 90.2% 24.7%",
    },
  },
  {
    name: "blue",
    label: "Blue",
    colors: {
      primary: "221.2 83.2% 53.3%",
      primaryForeground: "210 40% 98%",
      accent: "210 40% 96.1%",
      accentForeground: "222.2 47.4% 11.2%",
    },
  },
  {
    name: "yellow",
    label: "Yellow",
    colors: {
      primary: "47.9 95.8% 53.1%",
      primaryForeground: "48 96.5% 88.8%",
      accent: "48 96.5% 88.8%",
      accentForeground: "25.7 90.4% 37.3%",
    },
  },
  {
    name: "violet",
    label: "Violet",
    colors: {
      primary: "262.1 83.3% 57.8%",
      primaryForeground: "270 91.3% 95.1%",
      accent: "270 95.2% 95.1%",
      accentForeground: "263.4 70% 50.4%",
    },
  },
];

/**
 * Get theme preset by name
 */
export function getThemePreset(name: string): ThemePreset | undefined {
  return THEME_PRESETS.find((theme) => theme.name === name);
}

/**
 * Get preview color for theme (returns HSL string for display)
 */
export function getThemePreviewColor(theme: ThemePreset): string {
  return `hsl(${theme.colors.primary})`;
}
