/**
 * Transform data for specific chart types that need special formatting
 */
export function transformDataForChartType(data, chartType, options = {}) {
    const { categoryField = 'category', valueField = 'y', seriesField = 'series', colors = [] } = options;
    switch (chartType) {
        case 'pie':
        case 'arc':
            return transformForPieChart(data, { categoryField, valueField, colors });
        // Hierarchy charts (future support)
        // case 'pack':
        // case 'tree':
        // case 'treemap':
        // case 'sunburst':
        // case 'partition':
        //   return transformForHierarchyChart(data, chartType, options);
        // Graph charts (future support)
        // case 'sankey':
        //   return transformForSankeyChart(data, options);
        case 'calendar':
            return transformForCalendarChart(data, options);
        // Stacked charts (future support)
        // case 'barstack':
        // case 'areastack':
        //   return transformForStackedChart(data, { seriesField, valueField, categoryField: 'x' });
        // Geo charts (future support)
        // case 'choropleth':
        // case 'geopath':
        // case 'geopoint':
        //   return transformForGeoChart(data, chartType, options);
        default:
            // For standard xy charts, return as-is or with minimal transformation
            return data;
    }
}
/**
 * Transform data for pie/arc charts - LayerChart expects 'value' property
 */
function transformForPieChart(data, options) {
    const { categoryField, valueField, colors } = options;
    // Group data by category if needed
    const groupedData = data.reduce((acc, item) => {
        const category = item[categoryField] || item.category || item.label || String(item.x);
        const existing = acc.find(d => d.category === category);
        if (existing) {
            existing.value += Math.abs(Number(item[valueField] || item.value || item.y || 0));
        }
        else {
            acc.push({
                category,
                value: Math.abs(Number(item[valueField] || item.value || item.y || 0))
            });
        }
        return acc;
    }, []);
    // Filter out zero values and sort by value descending for better visualization
    const filteredData = groupedData
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
    // Return data in the format LayerChart Pie expects
    // Important: Pie charts in LayerChart need the data to have a 'value' field
    // Colors are handled through the Chart's cScale prop
    return filteredData.map((item, index) => ({
        // Required field for pie charts
        value: item.value,
        // Label for display/legend
        label: item.category,
        // Category for grouping
        category: item.category,
        // If colors are provided, map them (these should be resolved HSL strings, not CSS variables)
        ...(colors && colors.length > 0 && colors[index % colors.length]
            ? { color: colors[index % colors.length] }
            : {})
    }));
}
/**
 * Transform data for hierarchy charts (pack, tree, treemap, sunburst, partition)
 * @future Will be implemented when LayerChart supports hierarchy charts
 */
// function transformForHierarchyChart(
//   data: any[],
//   chartType: ChartType,
//   options: any
// ) {
//   // For now, assume data is already in hierarchical format or needs basic grouping
//   // This is a simplified implementation - real hierarchy transformation is more complex
//   if (Array.isArray(data) && data.length > 0 && !data[0].children) {
//     // Convert flat data to simple hierarchy
//     return {
//       name: 'root',
//       children: data.map((item, index) => ({
//         name: item.category || item.x || `Item ${index}`,
//         value: item.value || item.y || 1,
//         ...item
//       }))
//     };
//   }
//   
//   return data;
// }
/**
 * Transform data for Sankey diagrams
 * @future Will be implemented when LayerChart supports Sankey charts
 */
// function transformForSankeyChart(data: any[], options: any) {
//   // Sankey needs nodes and links structure
//   if (Array.isArray(data) && data.length > 0) {
//     // If data is already in Sankey format, return as-is
//     if (data.some(item => item.nodes || item.links)) {
//       return data[0]; // Assume first item contains the full Sankey data structure
//     }
//     
//     // Try to create basic Sankey structure from flat data
//     // This is a simplified transformation - real Sankey data prep is more complex
//     const nodes = new Set<string>();
//     const links: any[] = [];
//     
//     data.forEach(item => {
//       if (item.source && item.target) {
//         nodes.add(item.source);
//         nodes.add(item.target);
//         links.push({
//           source: item.source,
//           target: item.target,
//           value: item.value || item.y || 1
//         });
//       }
//     });
//     
//     return {
//       nodes: Array.from(nodes).map(name => ({ id: name, name })),
//       links
//     };
//   }
//   
//   return data;
// }
/**
 * Transform data for calendar heatmaps
 */
function transformForCalendarChart(data, options) {
    const { dateField = 'x', valueField = 'y' } = options;
    return data.map(item => ({
        ...item,
        date: item[dateField] instanceof Date ? item[dateField] : new Date(item[dateField]),
        value: item[valueField] || item.y || 0
    }));
}
/**
 * Transform data for stacked charts (barstack, areastack)
 * @future Will be implemented when LayerChart supports stacked charts
 */
// function transformForStackedChart(
//   data: any[],
//   options: { seriesField: string; valueField: string; categoryField: string }
// ) {
//   const { seriesField, valueField, categoryField } = options;
//   
//   // Group by category and pivot by series
//   const grouped = data.reduce((acc, item) => {
//     const category = item[categoryField];
//     const series = item[seriesField];
//     const value = item[valueField] || item.y || 0;
//     
//     if (!acc[category]) {
//       acc[category] = { [categoryField]: category };
//     }
//     
//     acc[category][series] = (acc[category][series] || 0) + value;
//     
//     return acc;
//   }, {} as Record<string, any>);
//   
//   return Object.values(grouped);
// }
/**
 * Transform data for geographic charts
 * @future Will be implemented when LayerChart supports geo charts
 */
// function transformForGeoChart(data: any[], chartType: ChartType, options: any) {
//   // Geographic charts need special data structures
//   // This is a placeholder - real geo transformation depends on the specific use case
//   switch (chartType) {
//     case 'choropleth':
//       // Choropleth needs geographic features with data values
//       return data.map(item => ({
//         ...item,
//         properties: {
//           ...item.properties,
//           value: item.value || item.y || 0
//         }
//       }));
//       
//     case 'geopoint':
//       // Geographic points need coordinates
//       return data.map(item => ({
//         ...item,
//         coordinates: item.coordinates || [item.longitude || 0, item.latitude || 0]
//       }));
//       
//     default:
//       return data;
//   }
// }
/**
 * Get the appropriate data accessor for a chart type
 */
export function getDataAccessorsForChartType(chartType) {
    switch (chartType) {
        case 'pie':
        case 'arc':
            // LayerChart Pie component uses ctx.x as the value accessor
            // See: node_modules/layerchart/dist/components/Pie.svelte line 125
            return { x: 'value', c: 'category' };
        case 'calendar':
            return { x: 'date', y: 'value' };
        // Hierarchy charts (future support)
        // case 'pack':
        // case 'tree':
        // case 'treemap':
        // case 'sunburst':
        // case 'partition':
        //   return {}; // Hierarchy charts use their own layout algorithms
        // Graph charts (future support)
        // case 'sankey':
        //   return {}; // Sankey uses nodes/links structure
        default:
            return { x: 'x', y: 'y' };
    }
}
/**
 * Determine if a chart type supports multi-series rendering
 */
export function supportsMultiSeries(chartType) {
    const multiSeriesTypes = [
        'bar', 'area', 'line', 'scatter', 'spline'
        // Future: 'connectedpoints', 'barstack', 'areastack'
    ];
    return multiSeriesTypes.includes(chartType);
}
/**
 * Determine if a chart type is circular/radial
 */
export function isCircularChart(chartType) {
    const circularTypes = ['pie', 'arc']; // Future: 'sunburst'
    return circularTypes.includes(chartType);
}
/**
 * Determine if a chart type requires hierarchical data
 */
export function requiresHierarchicalData(chartType) {
    const hierarchyTypes = []; // Future: 'pack', 'tree', 'treemap', 'sunburst', 'partition'
    return hierarchyTypes.includes(chartType);
}
/**
 * Get recommended chart types based on data characteristics
 */
export function recommendChartTypes(data) {
    if (!data || data.length === 0)
        return [];
    const sample = data[0];
    const recommendations = [];
    // Check for standard x/y data
    if (sample.x !== undefined && sample.y !== undefined) {
        recommendations.push('bar', 'line', 'area', 'scatter');
    }
    // Check for categorical data suitable for pie charts
    if (sample.category && (sample.value || sample.y)) {
        recommendations.push('pie', 'arc');
    }
    // Check for time series data
    if (sample.x instanceof Date || (typeof sample.x === 'string' && !isNaN(Date.parse(sample.x)))) {
        recommendations.push('line', 'area', 'calendar');
    }
    // Check for hierarchical data
    if (sample.children || sample.parent) {
        // Future: recommendations.push('tree', 'treemap', 'pack', 'sunburst');
    }
    // Check for graph data
    if (sample.source && sample.target) {
        // Future: recommendations.push('sankey', 'link');
    }
    return recommendations;
}
//# sourceMappingURL=chart-transformers.js.map