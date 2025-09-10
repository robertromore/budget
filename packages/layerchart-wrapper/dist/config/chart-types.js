import ChartBar from "@lucide/svelte/icons/bar-chart";
import CalendarIcon from "@lucide/svelte/icons/calendar";
import ChartLine from "@lucide/svelte/icons/line-chart";
import ChartPie from "@lucide/svelte/icons/pie-chart";
import Target from "@lucide/svelte/icons/target";
import TrendingUp from "@lucide/svelte/icons/trending-up";
import Zap from "@lucide/svelte/icons/zap";
// Available chart types grouped by category (based on current LayerChart support)
export const ALL_CHART_TYPES = [
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
            { value: "arc", label: "Arc Chart", icon: ChartPie, description: "Partial circular chart" },
        ],
    },
    {
        label: "Points & Scatter",
        options: [
            { value: "scatter", label: "Scatter Plot", icon: Zap, description: "Individual data points" },
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
