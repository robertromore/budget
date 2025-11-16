/**
 * Chart color configuration system
 * Provides theme-aware color resolution and customization
 */

export interface ColorConfig {
  theme?: "auto" | "light" | "dark" | "system";
  customColors?: Record<string, string>;
  fallback?: string;
  colorLibrary?: "auto" | "culori" | "chroma-js" | "none";
}

/**
 * Default color configuration
 */
const DEFAULT_CONFIG: ColorConfig = {
  theme: "auto",
  customColors: {},
  fallback: "hsl(217 91% 60%)", // Blue
  colorLibrary: "auto",
};

/**
 * Theme-specific color mappings for OKLCH conversion
 */
export const themeColorMappings: Record<string, Record<string, string>> = {
  light: {
    // Common OKLCH values mapped to HSL equivalents for light theme
    "oklch(0.7 0.1 200)": "hsl(217 91% 60%)", // Blue
    "oklch(0.65 0.15 150)": "hsl(142 71% 45%)", // Green
    "oklch(0.6 0.2 20)": "hsl(350 89% 60%)", // Red
    "oklch(0.8 0.15 90)": "hsl(47 96% 53%)", // Yellow
    "oklch(0.7 0.15 60)": "hsl(25 95% 53%)", // Orange
    "oklch(0.65 0.2 280)": "hsl(262 83% 58%)", // Purple
    "oklch(0.5 0.15 200)": "hsl(193 82% 31%)", // Teal
    "oklch(0.75 0.1 350)": "hsl(343 75% 68%)", // Pink
  },
  dark: {
    // Adjusted mappings for dark theme with higher contrast
    "oklch(0.7 0.1 200)": "hsl(217 91% 70%)", // Lighter blue
    "oklch(0.65 0.15 150)": "hsl(142 71% 55%)", // Lighter green
    "oklch(0.6 0.2 20)": "hsl(350 89% 70%)", // Lighter red
    "oklch(0.8 0.15 90)": "hsl(47 96% 63%)", // Lighter yellow
    "oklch(0.7 0.15 60)": "hsl(25 95% 63%)", // Lighter orange
    "oklch(0.65 0.2 280)": "hsl(262 83% 68%)", // Lighter purple
    "oklch(0.5 0.15 200)": "hsl(193 82% 41%)", // Lighter teal
    "oklch(0.75 0.1 350)": "hsl(343 75% 78%)", // Lighter pink
  },
};

/**
 * Resolve color configuration with defaults
 */
export function resolveColorConfig(config?: Partial<ColorConfig>): ColorConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    customColors: {
      ...DEFAULT_CONFIG.customColors,
      ...config?.customColors,
    },
  };
}
