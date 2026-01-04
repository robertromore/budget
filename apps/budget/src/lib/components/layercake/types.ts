import AreaChart from '@lucide/svelte/icons/area-chart';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import BarChartHorizontal from '@lucide/svelte/icons/bar-chart-horizontal';
import Calendar from '@lucide/svelte/icons/calendar';
import Circle from '@lucide/svelte/icons/circle';
import CircleDot from '@lucide/svelte/icons/circle-dot';
import Hexagon from '@lucide/svelte/icons/hexagon';
import LineChart from '@lucide/svelte/icons/line-chart';
import ScatterChart from '@lucide/svelte/icons/scatter-chart';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import type { Component } from 'svelte';

export type ChartType =
	| 'line'
	| 'area'
	| 'bar'
	| 'line-area'
	| 'scatter'
	| 'stacked-bar'
	| 'stacked-area'
	| 'histogram'
	| 'dot-plot'
	| 'horizontal-bar'
	| 'radar'
	| 'calendar'
	| 'beeswarm';

export interface ChartTypeOption {
	type: ChartType;
	label: string;
	icon: Component<{ class?: string }>;
}

export const CHART_TYPES: Record<ChartType, ChartTypeOption> = {
	line: { type: 'line', label: 'Line', icon: TrendingUp },
	area: { type: 'area', label: 'Area', icon: AreaChart },
	bar: { type: 'bar', label: 'Bar', icon: BarChart3 },
	'line-area': { type: 'line-area', label: 'Area + Line', icon: LineChart },
	scatter: { type: 'scatter', label: 'Scatter', icon: ScatterChart },
	'stacked-bar': { type: 'stacked-bar', label: 'Stacked Bar', icon: BarChart3 },
	'stacked-area': { type: 'stacked-area', label: 'Stacked Area', icon: AreaChart },
	histogram: { type: 'histogram', label: 'Histogram', icon: BarChart3 },
	'dot-plot': { type: 'dot-plot', label: 'Dot Plot', icon: Circle },
	'horizontal-bar': { type: 'horizontal-bar', label: 'Horizontal Bar', icon: BarChartHorizontal },
	radar: { type: 'radar', label: 'Radar', icon: Hexagon },
	calendar: { type: 'calendar', label: 'Calendar', icon: Calendar },
	beeswarm: { type: 'beeswarm', label: 'Beeswarm', icon: CircleDot }
};
