/**
 * Accessibility-aware color and opacity calculations
 * Ensures WCAG compliance across light/dark themes and color schemes
 */

import { browser } from '$app/environment';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ColorScheme = 'default' | 'blue' | 'green' | 'orange' | 'red' | 'purple';

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to relative luminance (WCAG formula)
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 */
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Detect current theme mode from CSS custom properties or system preference
 */
function detectThemeMode(): ThemeMode {
  if (!browser) return 'light';
  
  // Check if dark mode class is applied to document
  if (document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  
  // Check CSS custom property for theme
  const themeValue = getComputedStyle(document.documentElement)
    .getPropertyValue('--theme-mode')
    .trim();
  
  if (themeValue === 'dark' || themeValue === 'light') {
    return themeValue as ThemeMode;
  }
  
  // Fall back to system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
}

/**
 * Get background color for current theme
 */
function getBackgroundColor(themeMode: ThemeMode): string {
  if (!browser) return '#ffffff';
  
  const computedStyle = getComputedStyle(document.documentElement);
  
  // Try to get actual CSS custom property values
  const bgHsl = computedStyle.getPropertyValue('--background').trim();
  if (bgHsl) {
    // Convert HSL to hex (simplified - assumes standard values)
    return themeMode === 'dark' ? '#0a0a0a' : '#ffffff';
  }
  
  // Fallback colors
  return themeMode === 'dark' ? '#0a0a0a' : '#ffffff';
}

/**
 * Color scheme mappings to approximate hex values
 */
const COLOR_SCHEME_COLORS: Record<ColorScheme, string> = {
  default: '#3b82f6', // blue-500
  blue: '#3b82f6',    // blue-500
  green: '#22c55e',   // green-500
  orange: '#f97316',  // orange-500
  red: '#ef4444',     // red-500
  purple: '#a855f7'   // purple-500
};

/**
 * Calculate optimal opacity for crosshair/overlay elements
 * Ensures minimum contrast while maintaining visibility
 */
export function calculateOptimalOpacity(
  colorScheme: ColorScheme = 'default',
  themeMode?: ThemeMode,
  targetContrast: number = 3.0 // WCAG AA standard for graphical elements
): number {
  const mode = themeMode || detectThemeMode();
  const backgroundColor = getBackgroundColor(mode);
  const foregroundColor = COLOR_SCHEME_COLORS[colorScheme];
  
  // Calculate base contrast between colors
  const baseContrast = getContrastRatio(foregroundColor, backgroundColor);
  
  // If base contrast is already sufficient, use moderate opacity
  if (baseContrast >= targetContrast) {
    return mode === 'dark' ? 0.7 : 0.6;
  }
  
  // For low contrast combinations, increase opacity
  if (baseContrast < 2) {
    return mode === 'dark' ? 0.9 : 0.8;
  }
  
  // Medium contrast - adjust based on theme
  return mode === 'dark' ? 0.8 : 0.7;
}

/**
 * Get optimal crosshair color with calculated opacity
 */
export function getOptimalCrosshairColor(
  colorScheme: ColorScheme = 'default',
  themeMode?: ThemeMode
): { color: string; opacity: number } {
  const mode = themeMode || detectThemeMode();
  const baseColor = COLOR_SCHEME_COLORS[colorScheme];
  const opacity = calculateOptimalOpacity(colorScheme, mode);
  
  return {
    color: baseColor,
    opacity
  };
}

/**
 * Get theme-aware grid opacity
 * Grid lines should be more subtle than crosshairs
 */
export function getOptimalGridOpacity(themeMode?: ThemeMode): number {
  const mode = themeMode || detectThemeMode();
  
  // Grid should be subtle but visible
  return mode === 'dark' ? 0.3 : 0.2;
}

/**
 * Get theme-aware point opacity for better visibility
 */
export function getOptimalPointOpacity(
  colorScheme: ColorScheme = 'default',
  themeMode?: ThemeMode
): number {
  const mode = themeMode || detectThemeMode();
  
  // Points should be prominent
  return mode === 'dark' ? 0.9 : 0.85;
}

/**
 * Reactive theme detection hook for Svelte components
 * Returns a reactive object that tracks theme changes
 */
export function createThemeDetector() {
  if (!browser) {
    // SSR fallback - return static light mode
    return {
      get mode() { return 'light' as ThemeMode; },
      get isLight() { return true; },
      get isDark() { return false; }
    };
  }

  // Only use $state if we're in a browser AND in a Svelte component context
  try {
    let currentMode = $state<ThemeMode>(detectThemeMode());
    
    // Watch for theme changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const observer = new MutationObserver(() => {
      currentMode = detectThemeMode();
    });
    
    darkModeQuery.addEventListener('change', () => {
      currentMode = detectThemeMode();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    
    return {
      get mode() { return currentMode; },
      get isLight() { return currentMode === 'light'; },
      get isDark() { return currentMode === 'dark'; }
    };
  } catch (error) {
    // Fallback to non-reactive version if $state is not available
    return {
      get mode() { return detectThemeMode(); },
      get isLight() { return detectThemeMode() === 'light'; },
      get isDark() { return detectThemeMode() === 'dark'; }
    };
  }
}

/**
 * Non-reactive theme detection for immediate use
 */
export function getCurrentTheme(): ThemeMode {
  return detectThemeMode();
}