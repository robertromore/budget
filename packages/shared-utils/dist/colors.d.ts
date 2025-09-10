export declare const colorUtils: {
    /**
     * Get a chart color by index, cycling through the color palette
     */
    getChartColor: (index: number) => string;
    /**
     * Get a CSS custom property color value
     */
    getThemeColor: (cssVariable: string) => string;
    /**
     * Get all available chart colors
     */
    getAllChartColors: () => string[];
    /**
     * Get semantic colors for financial data visualization
     */
    getFinancialColors(): {
        positive: string;
        negative: string;
        warning: string;
        neutral: string;
        zeroLine: string;
    };
    /**
     * Get multiple colors for category-based data (cycles through palette)
     */
    getCategoryColors: (count: number) => string[];
};
//# sourceMappingURL=colors.d.ts.map