/**
 * Chart-specific formatting utilities for data visualization
 * Provides optimized formatters for labels, rules, and annotations
 */
// @todo change to user's preferred locale
const locale = 'en-US';
const currency = 'USD';
export const chartFormatters = {
    /**
     * Standard currency formatting without decimals for clean chart labels
     * $1,234 instead of $1,234.00
     */
    currency: (value) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    },
    /**
     * Precise currency formatting with decimals for detailed values
     * $1,234.56
     */
    currencyPrecise: (value) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    },
    /**
     * Compact currency formatting for large values
     * $1.2K instead of $1,234
     */
    currencyCompact: (value) => {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            notation: 'compact',
            compactDisplay: 'short',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        }).format(value);
    },
    /**
     * Smart currency formatting that adapts based on value size
     * Small values: $123, Medium: $1,234, Large: $1.2K
     */
    currencySmart: (value) => {
        const absValue = Math.abs(value);
        if (absValue >= 1000000) {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                notation: 'compact',
                compactDisplay: 'short',
                minimumFractionDigits: 0,
                maximumFractionDigits: 1
            }).format(value);
        }
        else if (absValue >= 10000) {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                notation: 'compact',
                compactDisplay: 'short',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
        }
        else {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
        }
    },
    /**
     * Number formatting with thousands separators
     * 1,234 instead of 1234
     */
    number: (value) => {
        return new Intl.NumberFormat(locale).format(value);
    },
    /**
     * Percentage formatting
     * 12.5% instead of 0.125
     */
    percentage: (value) => {
        return new Intl.NumberFormat(locale, {
            style: 'percent',
            minimumFractionDigits: 0,
            maximumFractionDigits: 1
        }).format(value / 100);
    },
    /**
     * Compact number formatting for large values
     * 1.2K instead of 1,234
     */
    numberCompact: (value) => {
        return new Intl.NumberFormat(locale, {
            notation: 'compact',
            compactDisplay: 'short'
        }).format(value);
    }
};
/**
 * Helper function to format values for chart data points
 * Includes the data point context for more intelligent formatting
 */
export function formatChartValue(value, datum, formatType = 'currencySmart') {
    return chartFormatters[formatType](value);
}
/**
 * Format rule values (like averages, thresholds) for chart annotations
 * Uses smart formatting by default
 */
export function formatRuleValue(value) {
    return chartFormatters.currencySmart(value);
}
//# sourceMappingURL=chart-formatters.js.map