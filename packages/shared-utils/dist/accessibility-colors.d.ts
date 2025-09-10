/**
 * Accessibility-aware color and opacity calculations
 * Ensures WCAG compliance across light/dark themes and color schemes
 */
export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeColorScheme = 'default' | 'blue' | 'green' | 'orange' | 'red' | 'purple';
/**
 * Calculate optimal opacity for crosshair/overlay elements
 * Ensures minimum contrast while maintaining visibility
 */
export declare function calculateOptimalOpacity(colorScheme?: ThemeColorScheme, themeMode?: ThemeMode, targetContrast?: number): number;
/**
 * Get optimal crosshair color with calculated opacity
 */
export declare function getOptimalCrosshairColor(colorScheme?: ThemeColorScheme, themeMode?: ThemeMode): {
    color: string;
    opacity: number;
};
/**
 * Get theme-aware grid opacity
 * Grid lines should be more subtle than crosshairs
 */
export declare function getOptimalGridOpacity(themeMode?: ThemeMode): number;
/**
 * Get theme-aware point opacity for better visibility
 */
export declare function getOptimalPointOpacity(colorScheme?: ThemeColorScheme, themeMode?: ThemeMode): number;
/**
 * Reactive theme detection hook for Svelte components
 * Returns a reactive object that tracks theme changes
 */
export declare function createThemeDetector(): {
    readonly mode: ThemeMode;
    readonly isLight: boolean;
    readonly isDark: boolean;
};
/**
 * Non-reactive theme detection for immediate use
 */
export declare function getCurrentTheme(): ThemeMode;
//# sourceMappingURL=accessibility-colors.d.ts.map