import { colorUtils } from "./colors";
/**
 * Global chart color schemes available throughout the application
 */
export const CHART_COLOR_SCHEMES = {
    default: {
        name: "Default",
        colors: Array.from({ length: 8 }, (_, i) => colorUtils.getChartColor(i)),
        description: "Balanced multi-color palette",
        category: "general",
    },
    financial: {
        name: "Financial",
        colors: [
            colorUtils.getChartColor(1), // Green - positive/income
            colorUtils.getChartColor(2), // Red - negative/expenses
            colorUtils.getChartColor(0), // Blue - neutral/balance
            colorUtils.getChartColor(4), // Orange - accent/other
        ],
        description: "Green for income, red for expenses",
        category: "financial",
    },
    monochrome: {
        name: "Mono",
        colors: [
            "hsl(220 13% 69%)", // Light gray
            "hsl(220 13% 50%)", // Medium gray
            "hsl(220 13% 31%)", // Dark gray
            "hsl(220 13% 18%)", // Very dark gray
        ],
        description: "Grayscale color scheme",
        category: "accessibility",
    },
    vibrant: {
        name: "Vibrant",
        colors: [
            "hsl(340 82% 52%)", // Vibrant pink
            "hsl(291 64% 42%)", // Vibrant purple
            "hsl(262 83% 58%)", // Vibrant blue
            "hsl(175 70% 41%)", // Vibrant teal
        ],
        description: "High contrast vibrant colors",
        category: "thematic",
    },
    pastel: {
        name: "Pastel",
        colors: [
            "hsl(210 40% 80%)", // Pastel blue
            "hsl(120 40% 80%)", // Pastel green
            "hsl(60 40% 80%)", // Pastel yellow
            "hsl(0 40% 80%)", // Pastel red
        ],
        description: "Soft pastel colors",
        category: "thematic",
    },
    earthy: {
        name: "Earthy",
        colors: [
            "hsl(30 40% 60%)", // Earth brown
            "hsl(120 25% 45%)", // Forest green
            "hsl(25 70% 50%)", // Clay orange
            "hsl(50 30% 50%)", // Khaki
        ],
        description: "Natural earth tone colors",
        category: "thematic",
    },
    ocean: {
        name: "Ocean",
        colors: [
            "hsl(200 80% 60%)", // Ocean blue
            "hsl(180 60% 50%)", // Teal
            "hsl(220 70% 45%)", // Deep blue
            "hsl(160 40% 40%)", // Sea green
        ],
        description: "Ocean and water inspired colors",
        category: "thematic",
    },
    sunset: {
        name: "Sunset",
        colors: [
            "hsl(15 85% 60%)", // Sunset orange
            "hsl(0 75% 55%)", // Sunset red
            "hsl(45 80% 65%)", // Golden yellow
            "hsl(330 60% 50%)", // Pink
        ],
        description: "Warm sunset colors",
        category: "thematic",
    },
};
/**
 * Get all color schemes grouped by category
 */
export function getColorSchemesByCategory() {
    const grouped = {
        general: [],
        financial: [],
        accessibility: [],
        thematic: [],
    };
    Object.values(CHART_COLOR_SCHEMES).forEach((scheme) => {
        grouped[scheme.category].push(scheme);
    });
    return grouped;
}
/**
 * Get a specific color scheme by key
 */
export function getColorScheme(key) {
    return CHART_COLOR_SCHEMES[key] || null;
}
/**
 * Get colors from a scheme by key
 */
export function getSchemeColors(key) {
    const scheme = getColorScheme(key);
    return scheme?.colors || CHART_COLOR_SCHEMES.default.colors;
}
/**
 * Get all available scheme keys
 */
export function getAvailableSchemeKeys() {
    return Object.keys(CHART_COLOR_SCHEMES);
}
/**
 * Financial-specific color utilities
 */
export const financialColors = {
    positive: colorUtils.getChartColor(1), // Green
    negative: colorUtils.getChartColor(2), // Red
    neutral: colorUtils.getChartColor(0), // Blue
    warning: colorUtils.getChartColor(4), // Orange
    accent: colorUtils.getChartColor(5), // Purple
};
/**
 * Semantic color mappings for common chart types
 */
export const semanticColors = {
    income: financialColors.positive,
    expenses: financialColors.negative,
    balance: financialColors.neutral,
    profit: financialColors.positive,
    loss: financialColors.negative,
    target: financialColors.warning,
    actual: financialColors.accent,
};
//# sourceMappingURL=chart-colors.js.map