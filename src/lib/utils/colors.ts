// Color utilities for consistent theming across the application

// Chart color palette using Tailwind's color system for consistent theming
const chartColors = [
  'hsl(217 91% 60%)',    // blue-500 equivalent  
  'hsl(142 71% 45%)',    // green-600 equivalent
  'hsl(350 89% 60%)',    // red-500 equivalent
  'hsl(262 83% 58%)',    // purple-500 equivalent
  'hsl(25 95% 53%)',     // orange-500 equivalent
  'hsl(175 85% 45%)',    // teal-600 equivalent
  'hsl(48 94% 68%)',     // yellow-400 equivalent
  'hsl(343 75% 68%)',    // pink-400 equivalent
];

export const colorUtils = {
  /**
   * Get a chart color by index, cycling through the color palette
   */
  getChartColor: (index: number): string => {
    return chartColors[index % chartColors.length];
  },

  /**
   * Get a CSS custom property color value
   */
  getThemeColor: (cssVariable: string): string => {
    return `hsl(var(--${cssVariable}))`;
  },

  /**
   * Get all available chart colors
   */
  getAllChartColors: (): string[] => {
    return [...chartColors];
  }
};