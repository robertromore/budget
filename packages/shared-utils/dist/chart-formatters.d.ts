/**
 * Chart-specific formatting utilities for data visualization
 * Provides optimized formatters for labels, rules, and annotations
 */
export declare const chartFormatters: {
    /**
     * Standard currency formatting without decimals for clean chart labels
     * $1,234 instead of $1,234.00
     */
    currency: (value: number) => string;
    /**
     * Precise currency formatting with decimals for detailed values
     * $1,234.56
     */
    currencyPrecise: (value: number) => string;
    /**
     * Compact currency formatting for large values
     * $1.2K instead of $1,234
     */
    currencyCompact: (value: number) => string;
    /**
     * Smart currency formatting that adapts based on value size
     * Small values: $123, Medium: $1,234, Large: $1.2K
     */
    currencySmart: (value: number) => string;
    /**
     * Number formatting with thousands separators
     * 1,234 instead of 1234
     */
    number: (value: number) => string;
    /**
     * Percentage formatting
     * 12.5% instead of 0.125
     */
    percentage: (value: number) => string;
    /**
     * Compact number formatting for large values
     * 1.2K instead of 1,234
     */
    numberCompact: (value: number) => string;
};
/**
 * Helper function to format values for chart data points
 * Includes the data point context for more intelligent formatting
 */
export declare function formatChartValue(value: number, datum?: any, formatType?: keyof typeof chartFormatters): string;
/**
 * Format rule values (like averages, thresholds) for chart annotations
 * Uses smart formatting by default
 */
export declare function formatRuleValue(value: number): string;
//# sourceMappingURL=chart-formatters.d.ts.map