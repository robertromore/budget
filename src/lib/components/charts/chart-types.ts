import { ChartBar, ChartLine, ChartPie, TrendingUp, Zap, CalendarIcon, Target } from '$lib/components/icons';

export type ChartType = 'bar' | 'area' | 'line' | 'scatter' | 'pie' | 'arc' | 'threshold' | 'calendar' | 'hull';

export interface ChartSeries {
  data: any[];
  type: ChartType;
  color?: string;
  colorIndex?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  label?: string;
  // Additional properties for specific chart types
  r?: number | ((d: any) => number); // For scatter plots
  innerRadius?: number; // For pie/arc charts
  outerRadius?: number; // For pie/arc charts
  startAngle?: number; // For arc charts
  endAngle?: number; // For arc charts
  threshold?: number; // For threshold charts
}

export interface ChartTypeOption {
  value: ChartType;
  label: string;
  icon: any;
  description: string;
}

export interface ChartTypeGroup {
  label: string;
  options: ChartTypeOption[];
}

// All available chart types grouped by category
export const ALL_CHART_TYPES: ChartTypeGroup[] = [
  {
    label: 'Line & Area',
    options: [
      { value: 'line', label: 'Line Chart', icon: ChartLine, description: 'Connected points showing trends' },
      { value: 'area', label: 'Area Chart', icon: TrendingUp, description: 'Filled area under the line' }
    ]
  },
  {
    label: 'Bars & Columns',
    options: [
      { value: 'bar', label: 'Bar Chart', icon: ChartBar, description: 'Rectangular bars for comparison' }
    ]
  },
  {
    label: 'Circular',
    options: [
      { value: 'pie', label: 'Pie Chart', icon: ChartPie, description: 'Circular sectors showing proportions' },
      { value: 'arc', label: 'Arc Chart', icon: ChartPie, description: 'Partial circular chart' }
    ]
  },
  {
    label: 'Points & Scatter',
    options: [
      { value: 'scatter', label: 'Scatter Plot', icon: Zap, description: 'Individual data points' }
    ]
  },
  {
    label: 'Specialized',
    options: [
      { value: 'threshold', label: 'Threshold Chart', icon: Target, description: 'Data above/below threshold' },
      { value: 'hull', label: 'Hull Chart', icon: TrendingUp, description: 'Convex hull around points' },
      { value: 'calendar', label: 'Calendar Heatmap', icon: CalendarIcon, description: 'Time-based heatmap' }
    ]
  }
];