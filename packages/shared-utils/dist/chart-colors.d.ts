export interface ColorScheme {
    name: string;
    colors: string[];
    description: string;
    category: "general" | "financial" | "accessibility" | "thematic";
}
/**
 * Global chart color schemes available throughout the application
 */
export declare const CHART_COLOR_SCHEMES: Record<string, ColorScheme>;
/**
 * Get all color schemes grouped by category
 */
export declare function getColorSchemesByCategory(): Record<string, ColorScheme[]>;
/**
 * Get a specific color scheme by key
 */
export declare function getColorScheme(key: string): ColorScheme | null;
/**
 * Get colors from a scheme by key
 */
export declare function getSchemeColors(key: string): string[];
/**
 * Get all available scheme keys
 */
export declare function getAvailableSchemeKeys(): string[];
/**
 * Financial-specific color utilities
 */
export declare const financialColors: {
    positive: string;
    negative: string;
    neutral: string;
    warning: string;
    accent: string;
};
/**
 * Semantic color mappings for common chart types
 */
export declare const semanticColors: {
    income: string;
    expenses: string;
    balance: string;
    profit: string;
    loss: string;
    target: string;
    actual: string;
};
//# sourceMappingURL=chart-colors.d.ts.map