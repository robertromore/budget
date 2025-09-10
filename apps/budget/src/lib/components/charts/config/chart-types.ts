import {
  CalendarIcon,
  ChartBar,
  ChartLine,
  ChartPie,
  Target,
  TrendingUp,
  Zap,
} from "$lib/components/icons";

export type ChartType =
  // Data-driven charts (currently available in LayerChart)
  | "bar"
  | "area"
  | "line"
  | "scatter"
  | "pie"
  | "arc"
  | "threshold"
  | "calendar"
  | "hull"
  | "spline";
// Future chart types (will be added when LayerChart supports them)
// | 'barstack' | 'areastack' | 'pack' | 'tree' | 'treemap' | 'sunburst' | 'partition'
// | 'sankey' | 'link' | 'choropleth' | 'geopath' | 'geopoint' | 'connectedpoints';

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
  // Hierarchy properties
  value?: string | ((d: any) => number); // For hierarchy charts
  children?: string; // Field name for hierarchy children
  // Graph properties
  source?: any; // For link/graph charts
  target?: any; // For link/graph charts
  // Stacking properties
  keys?: string[]; // For stacked charts
  // Geo properties
  projection?: any; // For geo charts
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

// Available chart types grouped by category (based on current LayerChart support)
export const ALL_CHART_TYPES: ChartTypeGroup[] = [
  {
    label: "Line & Area",
    options: [
      {
        value: "line",
        label: "Line Chart",
        icon: ChartLine,
        description: "Connected points showing trends",
      },
      {
        value: "area",
        label: "Area Chart",
        icon: TrendingUp,
        description: "Filled area under the line",
      },
      {
        value: "spline",
        label: "Spline Chart",
        icon: ChartLine,
        description: "Smooth curved line through data points",
      },
    ],
  },
  {
    label: "Bars & Columns",
    options: [
      {
        value: "bar",
        label: "Bar Chart",
        icon: ChartBar,
        description: "Rectangular bars for comparison",
      },
    ],
  },
  {
    label: "Circular",
    options: [
      {
        value: "pie",
        label: "Pie Chart",
        icon: ChartPie,
        description: "Circular sectors showing proportions",
      },
      {value: "arc", label: "Arc Chart", icon: ChartPie, description: "Partial circular chart"},
    ],
  },
  {
    label: "Points & Scatter",
    options: [
      {value: "scatter", label: "Scatter Plot", icon: Zap, description: "Individual data points"},
    ],
  },
  {
    label: "Specialized",
    options: [
      {
        value: "threshold",
        label: "Threshold Chart",
        icon: Target,
        description: "Data above/below threshold",
      },
      {
        value: "hull",
        label: "Hull Chart",
        icon: TrendingUp,
        description: "Convex hull around points",
      },
      {
        value: "calendar",
        label: "Calendar Heatmap",
        icon: CalendarIcon,
        description: "Time-based heatmap",
      },
    ],
  },
];

// Future chart types (commented out until LayerChart supports them)
/*
{
  label: 'Stacked Charts',
  options: [
    { value: 'areastack', label: 'Stacked Area', icon: Layers, description: 'Multiple series stacked as areas' },
    { value: 'barstack', label: 'Stacked Bars', icon: Layers, description: 'Multiple series stacked as bars' }
  ]
},
{
  label: 'Hierarchy',
  options: [
    { value: 'pack', label: 'Circle Packing', icon: Circle, description: 'Nested circles for hierarchy' },
    { value: 'tree', label: 'Tree Diagram', icon: Activity, description: 'Tree layout with branches' },
    { value: 'treemap', label: 'Treemap', icon: Layers, description: 'Nested rectangles for hierarchy' },
    { value: 'sunburst', label: 'Sunburst', icon: ChartPie, description: 'Radial hierarchy visualization' },
    { value: 'partition', label: 'Partition', icon: Layers, description: 'Rectangular partition layout' }
  ]
},
{
  label: 'Flow & Network',
  options: [
    { value: 'sankey', label: 'Sankey Diagram', icon: Activity, description: 'Flow diagram with nodes and links' },
    { value: 'link', label: 'Network Links', icon: Activity, description: 'Connections between nodes' }
  ]
},
{
  label: 'Geographic',
  options: [
    { value: 'choropleth', label: 'Choropleth Map', icon: Circle, description: 'Colored regions by data values' },
    { value: 'geopath', label: 'Geographic Paths', icon: ChartLine, description: 'Geographic boundaries and paths' },
    { value: 'geopoint', label: 'Geographic Points', icon: Circle, description: 'Points on geographic maps' }
  ]
}
*/
