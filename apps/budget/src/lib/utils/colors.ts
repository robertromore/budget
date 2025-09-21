/**
 *  color utilities with CSS variable resolution and Tailwind class support
 *
 * Supports multiple input formats:
 * - Simple CSS variable names: 'chart-1', 'primary'
 * - Tailwind utility classes: 'bg-primary', 'text-chart-1/50'
 * - Direct color values: '#3b82f6', 'hsl(217 91% 60%)'
 */

import { browser } from '$app/environment';
import { resolveColorConfig, themeColorMappings, type ColorConfig } from './chart-color-config';

/**
 * Chart color palette - pre-resolved HSL strings for LayerChart compatibility
 */
const CHART_COLORS = [
	'hsl(217 91% 60%)',  // Blue - Primary
	'hsl(142 71% 45%)',  // Green - Positive/Success
	'hsl(350 89% 60%)',  // Red - Negative/Error
	'hsl(47 96% 53%)',   // Yellow - Warning
	'hsl(25 95% 53%)',   // Orange - Accent
	'hsl(262 83% 58%)',  // Purple - Secondary
	'hsl(193 82% 31%)',  // Teal - Info
	'hsl(343 75% 68%)',  // Pink/Gray - Neutral
] as const;

/**
 * Semantic color mappings for financial data
 */
export const FINANCIAL_COLORS = {
	positive: CHART_COLORS[1], // Green - for positive cash flow, income, gains
	negative: CHART_COLORS[2], // Red - for negative cash flow, expenses, losses
	neutral: CHART_COLORS[0],  // Blue - for balance, neutral data
	zeroLine: CHART_COLORS[7], // Pink/Gray - for reference lines, zero lines
	primary: CHART_COLORS[0],  // Blue - primary data series
	accent: CHART_COLORS[4],   // Orange - accent data series
} as const;

/**
 * Fallback colors for CSS variables when resolution fails
 */
const CSS_VARIABLE_FALLBACKS: Record<string, string> = {
	'chart-1': CHART_COLORS[0],
	'chart-2': CHART_COLORS[1],
	'chart-3': CHART_COLORS[2],
	'chart-4': CHART_COLORS[3],
	'chart-5': CHART_COLORS[4],
	'primary': 'hsl(205 0% 0%)',
	'secondary': 'hsl(142 71% 45%)',
	'background': 'hsl(0 0% 100%)',
	'foreground': 'hsl(0 0% 9%)',
	'muted': 'hsl(0 0% 45%)',
	'muted-foreground': 'hsl(0 0% 45%)',
	'border': 'hsl(0 0% 90%)',
};

/**
 * Color utilities for chart components with  resolution
 */
export const colorUtils = {
	/**
	 * Get a chart color by index from the predefined palette
	 * Colors are pre-resolved HSL strings that work with LayerChart components
	 */
	getChartColor(index: number): string {
		return CHART_COLORS[index % CHART_COLORS.length];
	},

	/**
	 * Get multiple chart colors for multi-series data
	 */
	getChartColors(count: number): string[] {
		return Array.from({ length: count }, (_, i) => this.getChartColor(i));
	},

	/**
	 * Get semantic financial color
	 */
	getFinancialColor(type: keyof typeof FINANCIAL_COLORS): string {
		return FINANCIAL_COLORS[type];
	},

	/**
	 * Generate colors for categories (cycles through palette)
	 */
	getCategoryColors(categories: string[]): Record<string, string> {
		return categories.reduce(
			(acc, category, index) => {
				acc[category] = this.getChartColor(index);
				return acc;
			},
			{} as Record<string, string>
		);
	},

	/**
	 * Get color based on value (positive/negative semantic coloring)
	 */
	getValueColor(value: number, neutralThreshold = 0): string {
		if (value > neutralThreshold) return FINANCIAL_COLORS.positive;
		if (value < -neutralThreshold) return FINANCIAL_COLORS.negative;
		return FINANCIAL_COLORS.neutral;
	},

	/**
	 *  color resolution supporting multiple input formats
	 * @param input - CSS var name, Tailwind class, or direct color value
	 * @param config - Optional color configuration override
	 * @returns Resolved color string ready for LayerChart
	 */
	resolve(input: string, config?: Partial<ColorConfig>): string {
		if (!input || typeof input !== 'string') {
			return this._getFallbackColor(config);
		}

		const trimmed = input.trim();
		const resolvedConfig = resolveColorConfig(config);

		// 1. Check custom color overrides first
		if (resolvedConfig.customColors && resolvedConfig.customColors[trimmed]) {
			return resolvedConfig.customColors[trimmed];
		}

		// 2. Check if it's already a resolved color value (pass through)
		if (this._isDirectColor(trimmed)) {
			return trimmed;
		}

		// 3. Try to parse CSS variable in hsl(var(--name)) format
		const cssVarMatch = trimmed.match(/^hsl\(var\(--(.+?)\)\)$/);
		if (cssVarMatch) {
			return this._resolveVariable(cssVarMatch[1], resolvedConfig);
		}

		// 4. Try to parse as Tailwind utility class
		const parsed = this._parseTailwindClass(trimmed);
		if (parsed) {
			const { varName, opacity } = parsed;
			const baseColor = this._resolveVariable(varName, resolvedConfig);
			return opacity !== undefined ? this._applyOpacity(baseColor, opacity) : baseColor;
		}

		// 5. Treat as simple CSS variable name
		return this._resolveVariable(trimmed, resolvedConfig);
	},

	/**
	 * Resolve multiple color inputs at once
	 */
	resolveMultiple(inputs: string[], config?: Partial<ColorConfig>): string[] {
		return inputs.map(input => this.resolve(input, config));
	},

	/**
	 * Get fallback color from configuration
	 * @private
	 */
	_getFallbackColor(config?: Partial<ColorConfig>): string {
		const resolvedConfig = resolveColorConfig(config);
		return resolvedConfig.fallback || CSS_VARIABLE_FALLBACKS['chart-1'] || CHART_COLORS[0];
	},

	/**
	 * Convert a color value to a Tailwind stroke class
	 * @param color - HSL color string, CSS var name, or direct color
	 * @returns Tailwind stroke class that can override LayerChart defaults
	 */
	getStrokeClass(color: string): string {
		if (!color || typeof color !== 'string') {
			return 'stroke-gray-500';
		}

		const trimmed = color.trim();

		// Map common HSL values to standard Tailwind stroke classes
		const hslToStrokeMap: Record<string, string> = {
			'hsl(0 0% 30%)': 'stroke-gray-700',
			'hsl(0 0% 50%)': 'stroke-gray-500',
			'hsl(0 0% 70%)': 'stroke-gray-400',
			'hsl(142 71% 45%)': 'stroke-green-500',
			'hsl(350 89% 60%)': 'stroke-red-500',
			'hsl(217 91% 60%)': 'stroke-blue-500',
			'hsl(47 96% 53%)': 'stroke-yellow-500',
			'hsl(25 95% 53%)': 'stroke-orange-500',
			'hsl(262 83% 58%)': 'stroke-purple-500',
		};

		// Check for direct HSL match first
		if (hslToStrokeMap[trimmed]) {
			return hslToStrokeMap[trimmed];
		}

		// Handle CSS variables by extracting the variable name
		if (trimmed.startsWith('hsl(var(--') && trimmed.endsWith('))')) {
			const varName = trimmed.match(/--(.+?)\)/)?.[1];
			if (varName) {
				const varToStrokeMap: Record<string, string> = {
					'chart-1': 'stroke-blue-500',
					'chart-2': 'stroke-green-500',
					'chart-3': 'stroke-red-500',
					'primary': 'stroke-primary',
					'secondary': 'stroke-secondary',
					'muted': 'stroke-muted-foreground',
				};
				return varToStrokeMap[varName] || 'stroke-gray-500';
			}
		}

		// For any other HSL color, use arbitrary value syntax
		if (this._isDirectColor(trimmed)) {
			// Convert spaces to underscores for Tailwind arbitrary values
			const arbitraryValue = trimmed.replace(/\s/g, '_');
			return `stroke-[${arbitraryValue}]`;
		}

		// Fallback to gray
		return 'stroke-gray-500';
	},

	/**
	 * Check if input is already a direct color value
	 * @private
	 */
	_isDirectColor(input: string): boolean {
		// Check if it contains CSS variable references
		if (input.includes('var(')) {
			return false;
		}

		return input.startsWith('#') ||
			   input.startsWith('hsl(') ||
			   input.startsWith('rgb(') ||
			   input.startsWith('rgba(') ||
			   input.startsWith('hsla(');
	},

	/**
	 * Parse Tailwind utility class format
	 * @private
	 */
	_parseTailwindClass(input: string): { varName: string; opacity?: number } | null {
		// Match patterns like: bg-primary, text-chart-1, border-muted/50
		const match = input.match(/^(?:bg|text|border|fill|stroke|ring|outline)-(.+?)(?:\/(\d+))?$/);

		if (match) {
			const [, varName, opacityStr] = match;
			return {
				varName,
				opacity: opacityStr ? parseInt(opacityStr) / 100 : undefined
			};
		}

		// Also support just color/opacity without prefix (e.g., 'primary/50')
		const simpleMatch = input.match(/^(.+?)\/(\d+)$/);
		if (simpleMatch) {
			const [, varName, opacityStr] = simpleMatch;
			return {
				varName,
				opacity: parseInt(opacityStr) / 100
			};
		}

		return null;
	},

	/**
	 * Resolve a CSS variable name to its computed value
	 * @private
	 */
	_resolveVariable(varName: string, config: ColorConfig): string {
		if (!varName) return this._getFallbackColor(config);

		// Check custom colors first
		if (config.customColors && config.customColors[varName]) {
			return config.customColors[varName];
		}

		// Try browser resolution first
		if (browser) {
			try {
				const cssVar = `--${varName}`;
				const computedStyle = getComputedStyle(document.documentElement);
				const value = computedStyle.getPropertyValue(cssVar).trim();

				if (value) {
					// Handle OKLCH values using theme mappings or color library
					if (value.includes('oklch')) {
						return this._convertOklchValue(value, config);
					}

					// If it's space-separated HSL values, wrap them properly
					if (value.match(/^\d+(\.\d+)?\s+\d+(\.\d+)?%?\s+\d+(\.\d+)?%?$/)) {
						return `hsl(${value})`;
					}

					// If it's already a complete color value, return it
					if (this._isDirectColor(value)) {
						return value;
					}

					return value;
				}
			} catch (error) {
				// Fall through to fallback
				console.warn(`Failed to resolve CSS variable --${varName}:`, error);
			}
		}

		// Return fallback or construct CSS variable for SSR
		return CSS_VARIABLE_FALLBACKS[varName] || `hsl(var(--${varName}))`;
	},

	/**
	 * Apply opacity to a color string
	 * @private
	 */
	_applyOpacity(color: string, opacity: number): string {
		if (opacity < 0 || opacity > 1) {
			opacity = Math.max(0, Math.min(1, opacity));
		}

		// HSL format
		if (color.startsWith('hsl(')) {
			return color.replace(')', ` / ${opacity})`);
		}

		// RGB format
		if (color.startsWith('rgb(')) {
			return color.replace(')', ` / ${opacity})`);
		}

		// Hex format - convert to RGBA
		if (color.startsWith('#')) {
			const rgb = this._hexToRgb(color);
			if (rgb) {
				return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
			}
		}

		return color;
	},

	/**
	 * Convert hex color to RGB components
	 * @private
	 */
	_hexToRgb(hex: string): { r: number; g: number; b: number } | null {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	},

	/**
	 * Convert OKLCH value using theme mappings or color library
	 * @private
	 */
	_convertOklchValue(oklch: string, config: ColorConfig): string {
		// First try theme-specific mappings
		if (config.theme && config.theme !== 'auto') {
			const themeMapping = themeColorMappings[config.theme];
			if (themeMapping && themeMapping[oklch]) {
				return themeMapping[oklch];
			}
		}

		// Try to detect color library and convert
		if (config.colorLibrary !== 'none') {
			const converted = this._convertWithColorLibrary(oklch, config.colorLibrary);
			if (converted) return converted;
		}

		// Return fallback without warning (theme mappings handle common cases)
		return config.fallback || 'hsl(0 0% 50%)';
	},

	/**
	 * Attempt conversion using available color library
	 * @private
	 */
	_convertWithColorLibrary(oklch: string, library: ColorConfig['colorLibrary']): string | null {
		if (library === 'none') return null;

		try {
			// Try culori first (preferred)
			if (library === 'culori' || library === 'auto') {
				const culori = this._tryImportCulori();
				if (culori) {
					const hsl = culori.formatHsl(culori.converter('hsl')(oklch));
					if (hsl) return hsl;
				}
			}

			// Try chroma-js as fallback
			if (library === 'chroma-js' || library === 'auto') {
				const chroma = this._tryImportChroma();
				if (chroma) {
					return chroma(oklch).hsl();
				}
			}
		} catch (error) {
			// Color library failed, continue to fallback
		}

		return null;
	},

	/**
	 * Dynamically import culori if available
	 * @private
	 */
	_tryImportCulori(): any {
		if (typeof window === 'undefined') return null; // SSR safety

		try {
			// Check if culori is available globally
			if (typeof (globalThis as any).culori !== 'undefined') {
				return (globalThis as any).culori;
			}

			// Try to access via dynamic import (would need async version)
			// This is a placeholder for now - real implementation would be async
			return null;
		} catch {
			return null;
		}
	},

	/**
	 * Dynamically import chroma-js if available
	 * @private
	 */
	_tryImportChroma(): any {
		if (typeof window === 'undefined') return null; // SSR safety

		try {
			// Check if chroma is available globally
			if (typeof (globalThis as any).chroma !== 'undefined') {
				return (globalThis as any).chroma;
			}

			// Try to access via dynamic import (would need async version)
			// This is a placeholder for now - real implementation would be async
			return null;
		} catch {
			return null;
		}
	},
};

/**
 * Chart color theme for consistent styling
 */
export const CHART_THEME = {
	background: 'hsl(0 0% 100%)',     // White background
	gridLines: 'hsl(0 0% 90%)',      // Light gray grid lines
	axisLines: 'hsl(0 0% 70%)',      // Medium gray axis lines
	text: 'hsl(0 0% 20%)',           // Dark gray text
	tooltip: {
		background: 'hsl(0 0% 5%)',    // Dark tooltip background
		text: 'hsl(0 0% 95%)',        // Light tooltip text
		border: 'hsl(0 0% 30%)',      // Medium gray border
	},
} as const;
