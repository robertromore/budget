import {browser} from "$app/environment";
import {getThemePreset, type ThemePreset} from "$lib/config/theme-presets";
import {getLuminance, hexToOKLCH} from "$lib/utils/colors";

const STORAGE_KEY = "theme-preference";

interface ThemePreference {
  theme: string; // Preset name or 'custom'
  customColor?: string | undefined;
  timestamp: number;
}

/**
 * Theme preferences store using Svelte 5 runes
 * Manages theme selection and persistence
 *
 * TODO: Integrate with user preferences API when multi-user support is added
 * TODO: Sync theme preference to backend user settings
 */
class ThemePreferencesStore {
  private currentTheme = $state<string>("zinc");
  private customColor = $state<string | undefined>(undefined);

  constructor() {
    if (browser) {
      this.loadFromStorage();
      this.applyTheme();
    }
  }

  /**
   * Get current theme name
   */
  get theme(): string {
    return this.currentTheme;
  }

  /**
   * Get current custom color if set
   */
  get custom(): string | undefined {
    return this.customColor;
  }

  /**
   * Get current theme preset if applicable
   */
  get preset(): ThemePreset | undefined {
    if (this.currentTheme === "custom") {
      return undefined;
    }
    return getThemePreset(this.currentTheme);
  }

  /**
   * Check if current theme is custom
   */
  get isCustom(): boolean {
    return this.currentTheme === "custom";
  }

  /**
   * Get display name for current theme
   */
  get displayName(): string {
    if (this.currentTheme === "custom") {
      return "Custom";
    }
    const preset = this.preset;
    return preset?.label || "Unknown";
  }

  /**
   * Get preview color for current theme
   */
  get previewColor(): string {
    if (this.currentTheme === "custom" && this.customColor) {
      return this.customColor;
    }
    const preset = this.preset;
    if (preset) {
      return `hsl(${preset.colors.primary})`;
    }
    return "hsl(240 5.9% 10%)"; // Default zinc
  }

  /**
   * Set theme to a preset
   */
  setPreset(presetName: string) {
    const preset = getThemePreset(presetName);
    if (!preset) {
      console.warn(`Theme preset "${presetName}" not found`);
      return;
    }

    this.currentTheme = presetName;
    this.customColor = undefined;
    this.saveToStorage();
    this.applyTheme();
  }

  /**
   * Set custom theme color
   */
  setCustom(color: string) {
    this.currentTheme = "custom";
    this.customColor = color;
    this.saveToStorage();
    this.applyTheme();
  }

  /**
   * Apply current theme to document
   */
  private applyTheme() {
    if (!browser) return;

    const root = document.documentElement;

    if (this.currentTheme === "custom" && this.customColor) {
      // Apply custom color
      // Convert hex to OKLCH for CSS variables (matching the color space used in app.css)
      const oklchValues = hexToOKLCH(this.customColor);
      root.style.setProperty("--primary", `oklch(${oklchValues})`);
      root.style.setProperty("--accent", `oklch(${oklchValues})`);

      // Calculate appropriate foreground colors based on luminance
      const luminance = getLuminance(this.customColor);
      // Use white text for dark colors, black text for light colors
      // OKLCH format wrapped in oklch(): oklch(L C H) where L is 0-1, C is chroma, H is hue
      const foreground = luminance > 0.5 ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)";
      root.style.setProperty("--primary-foreground", foreground);
      root.style.setProperty("--accent-foreground", foreground);
    } else {
      // Apply preset theme (preset colors are in HSL format from shadcn-svelte)
      const preset = this.preset;
      if (preset) {
        root.style.setProperty("--primary", `hsl(${preset.colors.primary})`);
        root.style.setProperty("--primary-foreground", `hsl(${preset.colors.primaryForeground})`);
        root.style.setProperty("--accent", `hsl(${preset.colors.accent})`);
        root.style.setProperty("--accent-foreground", `hsl(${preset.colors.accentForeground})`);
      }
    }
  }

  /**
   * Load theme preference from localStorage
   */
  private loadFromStorage() {
    if (!browser) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const preference: ThemePreference = JSON.parse(stored);
        this.currentTheme = preference.theme;
        this.customColor = preference.customColor;
      }
    } catch (error) {
      console.error("Failed to load theme preference:", error);
    }
  }

  /**
   * Save theme preference to localStorage
   */
  private saveToStorage() {
    if (!browser) return;

    try {
      const preference: ThemePreference = {
        theme: this.currentTheme,
        customColor: this.customColor,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  }
}

// Export singleton instance
export const themePreferences = new ThemePreferencesStore();
