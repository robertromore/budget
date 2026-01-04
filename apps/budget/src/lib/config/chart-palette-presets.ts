/**
 * Chart color palette configurations
 * Defines different color schemes for data visualization
 */

export interface ChartPalettePreset {
	name: string;
	label: string;
	colors: {
		light: {
			chart1: string;
			chart2: string;
			chart3: string;
			chart4: string;
			chart5: string;
		};
		dark: {
			chart1: string;
			chart2: string;
			chart3: string;
			chart4: string;
			chart5: string;
		};
	};
}

export const CHART_PALETTE_PRESETS: ChartPalettePreset[] = [
	{
		name: "default",
		label: "Default",
		colors: {
			light: {
				chart1: "oklch(0.646 0.222 41.116)", // orange
				chart2: "oklch(0.6 0.118 184.704)", // teal
				chart3: "oklch(0.398 0.07 227.392)", // dark blue
				chart4: "oklch(0.828 0.189 84.429)", // yellow
				chart5: "oklch(0.769 0.188 70.08)", // gold
			},
			dark: {
				chart1: "oklch(0.488 0.243 264.376)", // purple/blue
				chart2: "oklch(0.696 0.17 162.48)", // green
				chart3: "oklch(0.769 0.188 70.08)", // gold
				chart4: "oklch(0.627 0.265 303.9)", // magenta
				chart5: "oklch(0.645 0.246 16.439)", // red
			},
		},
	},
	{
		name: "ocean",
		label: "Ocean",
		colors: {
			light: {
				chart1: "oklch(0.55 0.15 230)", // deep blue
				chart2: "oklch(0.65 0.12 200)", // cyan
				chart3: "oklch(0.50 0.18 260)", // indigo
				chart4: "oklch(0.70 0.10 180)", // teal
				chart5: "oklch(0.60 0.14 240)", // slate blue
			},
			dark: {
				chart1: "oklch(0.65 0.18 230)", // bright blue
				chart2: "oklch(0.72 0.14 200)", // light cyan
				chart3: "oklch(0.58 0.20 260)", // bright indigo
				chart4: "oklch(0.75 0.12 180)", // aqua
				chart5: "oklch(0.68 0.16 240)", // periwinkle
			},
		},
	},
	{
		name: "forest",
		label: "Forest",
		colors: {
			light: {
				chart1: "oklch(0.55 0.16 145)", // deep green
				chart2: "oklch(0.65 0.12 100)", // olive
				chart3: "oklch(0.50 0.10 50)", // brown
				chart4: "oklch(0.70 0.14 130)", // lime
				chart5: "oklch(0.60 0.08 80)", // moss
			},
			dark: {
				chart1: "oklch(0.68 0.18 145)", // bright green
				chart2: "oklch(0.72 0.14 100)", // light olive
				chart3: "oklch(0.58 0.12 50)", // tan
				chart4: "oklch(0.75 0.16 130)", // bright lime
				chart5: "oklch(0.65 0.10 80)", // sage
			},
		},
	},
	{
		name: "sunset",
		label: "Sunset",
		colors: {
			light: {
				chart1: "oklch(0.60 0.22 30)", // coral
				chart2: "oklch(0.70 0.20 50)", // orange
				chart3: "oklch(0.55 0.18 350)", // crimson
				chart4: "oklch(0.75 0.18 70)", // gold
				chart5: "oklch(0.50 0.20 320)", // burgundy
			},
			dark: {
				chart1: "oklch(0.68 0.24 30)", // bright coral
				chart2: "oklch(0.75 0.22 50)", // bright orange
				chart3: "oklch(0.62 0.20 350)", // rose
				chart4: "oklch(0.80 0.20 70)", // bright gold
				chart5: "oklch(0.58 0.22 320)", // plum
			},
		},
	},
	{
		name: "lavender",
		label: "Lavender",
		colors: {
			light: {
				chart1: "oklch(0.55 0.20 280)", // purple
				chart2: "oklch(0.65 0.18 320)", // pink
				chart3: "oklch(0.50 0.15 260)", // indigo
				chart4: "oklch(0.70 0.16 300)", // orchid
				chart5: "oklch(0.60 0.12 240)", // periwinkle
			},
			dark: {
				chart1: "oklch(0.65 0.22 280)", // bright purple
				chart2: "oklch(0.72 0.20 320)", // bright pink
				chart3: "oklch(0.58 0.18 260)", // bright indigo
				chart4: "oklch(0.75 0.18 300)", // bright orchid
				chart5: "oklch(0.68 0.14 240)", // light periwinkle
			},
		},
	},
	{
		name: "monochrome",
		label: "Monochrome",
		colors: {
			light: {
				chart1: "oklch(0.25 0 0)", // near black
				chart2: "oklch(0.40 0 0)", // dark gray
				chart3: "oklch(0.55 0 0)", // medium gray
				chart4: "oklch(0.70 0 0)", // light gray
				chart5: "oklch(0.85 0 0)", // near white
			},
			dark: {
				chart1: "oklch(0.95 0 0)", // near white
				chart2: "oklch(0.80 0 0)", // light gray
				chart3: "oklch(0.65 0 0)", // medium gray
				chart4: "oklch(0.50 0 0)", // dark gray
				chart5: "oklch(0.35 0 0)", // near black
			},
		},
	},
	{
		name: "vivid",
		label: "Vivid",
		colors: {
			light: {
				chart1: "oklch(0.65 0.28 25)", // vivid red-orange
				chart2: "oklch(0.70 0.25 145)", // vivid green
				chart3: "oklch(0.55 0.28 265)", // vivid blue
				chart4: "oklch(0.75 0.22 85)", // vivid yellow
				chart5: "oklch(0.60 0.26 310)", // vivid magenta
			},
			dark: {
				chart1: "oklch(0.72 0.30 25)", // bright vivid red-orange
				chart2: "oklch(0.75 0.27 145)", // bright vivid green
				chart3: "oklch(0.62 0.30 265)", // bright vivid blue
				chart4: "oklch(0.80 0.24 85)", // bright vivid yellow
				chart5: "oklch(0.67 0.28 310)", // bright vivid magenta
			},
		},
	},
	{
		name: "pastel",
		label: "Pastel",
		colors: {
			light: {
				chart1: "oklch(0.80 0.10 25)", // pastel coral
				chart2: "oklch(0.82 0.08 145)", // pastel mint
				chart3: "oklch(0.78 0.10 265)", // pastel blue
				chart4: "oklch(0.85 0.08 85)", // pastel yellow
				chart5: "oklch(0.80 0.09 310)", // pastel pink
			},
			dark: {
				chart1: "oklch(0.72 0.14 25)", // muted coral
				chart2: "oklch(0.74 0.12 145)", // muted mint
				chart3: "oklch(0.70 0.14 265)", // muted blue
				chart4: "oklch(0.77 0.12 85)", // muted yellow
				chart5: "oklch(0.72 0.13 310)", // muted pink
			},
		},
	},
];

/**
 * Get chart palette preset by name
 */
export function getChartPalettePreset(name: string): ChartPalettePreset | undefined {
	return CHART_PALETTE_PRESETS.find((palette) => palette.name === name);
}

/**
 * Get preview colors for a palette (returns first 5 colors for the current mode)
 */
export function getChartPalettePreviewColors(
	palette: ChartPalettePreset,
	isDark: boolean = false
): string[] {
	const colors = isDark ? palette.colors.dark : palette.colors.light;
	return [colors.chart1, colors.chart2, colors.chart3, colors.chart4, colors.chart5];
}
