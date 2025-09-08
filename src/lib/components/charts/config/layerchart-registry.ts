import type {Component} from "svelte";

// LayerChart component imports - only import what's actually available
import {
  Arc,
  Area,
  Axis,
  Bars,
  Calendar,
  Circle,
  Grid,
  Group,
  Hull,
  Labels,
  Legend,
  // Line, // This is for straight lines between two points, not line charts
  Pie,
  Points,
  Rule,
  Spline,
  Threshold,
} from "layerchart";

// Additional components not available in the current LayerChart version
// Will be added when they become available

/**
 * Interface for component configuration
 */
export interface LayerChartComponentConfig {
  component: Component<any, any, any>;
  category: "data-driven" | "hierarchy" | "graph" | "geo" | "radial" | "utility" | "interaction";
  props: string[];
  requiredProps: string[];
  description: string;
  dataRequirements: {
    format: "xy" | "hierarchical" | "graph" | "geo" | "categorical";
    fields: string[];
  };
  supportedFeatures: string[];
}

/**
 * Registry of all available LayerChart components
 */
export const LAYERCHART_COMPONENT_REGISTRY: Record<string, LayerChartComponentConfig> = {
  // Data-driven components
  area: {
    component: Area,
    category: "data-driven",
    props: ["data", "fill", "fillOpacity", "stroke", "strokeWidth", "curve", "class"],
    requiredProps: [],
    description: "Filled area under a line showing trends over time",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"],
    },
    supportedFeatures: ["animation", "multi-series", "stacking"],
  },

  line: {
    component: Spline,
    category: "data-driven",
    props: ["data", "fill", "fillOpacity", "stroke", "strokeWidth", "curve", "class"],
    requiredProps: [],
    description: "Line chart showing trends over time",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"],
    },
    supportedFeatures: ["animation", "multi-series", "stacking"],
  },

  bar: {
    component: Bars,
    category: "data-driven",
    props: ["data", "fill", "stroke", "strokeWidth", "padding", "horizontal", "class"],
    requiredProps: [],
    description: "Rectangular bars for categorical data comparison",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"],
    },
    supportedFeatures: ["animation", "multi-series", "horizontal", "stacking"],
  },

  spline: {
    component: Spline,
    category: "data-driven",
    props: ["data", "stroke", "strokeWidth", "fill", "curve", "class"],
    requiredProps: [],
    description: "Smooth curved line connecting data points",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"],
    },
    supportedFeatures: ["animation", "multi-series", "curves"],
  },

  points: {
    component: Points,
    category: "data-driven",
    props: ["data", "fill", "stroke", "strokeWidth", "r", "class"],
    requiredProps: [],
    description: "Individual data points as circles or custom shapes",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"],
    },
    supportedFeatures: ["animation", "multi-series", "variable-size"],
  },

  scatter: {
    component: Points,
    category: "data-driven",
    props: ["data", "fill", "stroke", "strokeWidth", "r", "class"],
    requiredProps: [],
    description: "Scatter plot showing individual data points",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"],
    },
    supportedFeatures: ["animation", "multi-series", "variable-size"],
  },

  hull: {
    component: Hull,
    category: "data-driven",
    props: ["data", "fill", "fillOpacity", "stroke", "strokeWidth", "class"],
    requiredProps: [],
    description: "Convex hull around a set of points",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"],
    },
    supportedFeatures: ["animation"],
  },

  rule: {
    component: Rule,
    category: "data-driven",
    props: [
      "data",
      "x",
      "y",
      "x1",
      "x2",
      "y1",
      "y2",
      "stroke",
      "strokeWidth",
      "strokeDasharray",
      "class",
    ],
    requiredProps: [],
    description: "Reference lines and value annotations",
    dataRequirements: {
      format: "xy",
      fields: [],
    },
    supportedFeatures: ["animation", "annotations"],
  },

  threshold: {
    component: Threshold,
    category: "data-driven",
    props: ["curve", "defined", "above", "below"],
    requiredProps: [],
    description: "Gradient visualization for data above and below a threshold value",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"],
    },
    supportedFeatures: ["animation", "gradient", "multi-series"],
  },

  // Radial/Circular components
  pie: {
    component: Pie,
    category: "radial",
    props: ["data", "innerRadius", "outerRadius", "padAngle", "cornerRadius", "range", "startAngle", "endAngle", "offset", "sort", "class"],
    requiredProps: [],
    description: "Circular sectors showing proportions of a whole",
    dataRequirements: {
      format: "categorical",
      fields: ["value"],
    },
    supportedFeatures: ["animation", "labels", "explode"],
  },

  arc: {
    component: Arc,
    category: "radial",
    props: [
      "data",
      "innerRadius",
      "outerRadius",
      "startAngle",
      "endAngle",
      "padAngle",
      "cornerRadius",
      "fill",
      "stroke",
      "offset",
      "class",
    ],
    requiredProps: [],
    description: "Individual arc segments for custom radial charts",
    dataRequirements: {
      format: "categorical",
      fields: ["value"],
    },
    supportedFeatures: ["animation", "custom-angles"],
  },

  // Hierarchy and Graph components are not available in the current LayerChart version
  // These will be added when LayerChart includes these components

  // Time-based components
  calendar: {
    component: Calendar,
    category: "data-driven",
    props: ["data", "start", "end", "value", "fill", "stroke", "cellSize", "class"],
    requiredProps: ["start", "end"],
    description: "Calendar heatmap for time-based data",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"], // x should be date, y should be value
    },
    supportedFeatures: ["animation", "date-navigation"],
  },

  // Utility/Layout components
  group: {
    component: Group,
    category: "utility",
    props: ["x", "y", "center", "class"],
    requiredProps: [],
    description: "SVG group for positioning and centering elements",
    dataRequirements: {
      format: "xy",
      fields: [],
    },
    supportedFeatures: ["animation", "positioning"],
  },

  circle: {
    component: Circle,
    category: "utility",
    props: ["cx", "cy", "r", "fill", "stroke", "strokeWidth", "class"],
    requiredProps: [],
    description: "SVG circle primitive with motion support",
    dataRequirements: {
      format: "xy",
      fields: [],
    },
    supportedFeatures: ["animation"],
  },

  labels: {
    component: Labels,
    category: "utility",
    props: ["data", "format", "x", "y", "fill", "fontSize", "textAnchor", "class"],
    requiredProps: [],
    description: "Data point labels with formatting options",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"],
    },
    supportedFeatures: ["formatting", "positioning"],
  },

  grid: {
    component: Grid,
    category: "utility",
    props: [
      "horizontal",
      "vertical",
      "stroke",
      "strokeWidth",
      "strokeDasharray",
      "opacity",
      "class",
    ],
    requiredProps: [],
    description: "Chart grid lines for reference",
    dataRequirements: {
      format: "xy",
      fields: [],
    },
    supportedFeatures: ["styling"],
  },

  axis: {
    component: Axis,
    category: "utility",
    props: [
      "placement",
      "ticks",
      "tickFormat",
      "tickSize",
      "tickPadding",
      "grid",
      "label",
      "labelProps",
      "class",
    ],
    requiredProps: ["placement"],
    description: "Chart axis with ticks and labels",
    dataRequirements: {
      format: "xy",
      fields: [],
    },
    supportedFeatures: ["formatting", "positioning", "grid"],
  },

  legend: {
    component: Legend,
    category: "utility",
    props: ["placement", "orientation", "colorScale", "format", "class"],
    requiredProps: [],
    description: "Chart legend with color mapping",
    dataRequirements: {
      format: "xy",
      fields: [],
    },
    supportedFeatures: ["positioning", "formatting"],
  },
};

/**
 * Get available chart types based on data format and requirements
 */
export function getAvailableChartTypes(
  dataFormat: "xy" | "hierarchical" | "graph" | "geo" | "categorical",
  features?: string[]
): string[] {
  return Object.entries(LAYERCHART_COMPONENT_REGISTRY)
    .filter(([_, config]) => {
      // Check if data format matches
      const formatMatch = config.dataRequirements.format === dataFormat;

      // Check if required features are supported (if provided)
      const featureMatch =
        !features || features.every((feature) => config.supportedFeatures.includes(feature));

      return formatMatch && featureMatch;
    })
    .map(([type, _]) => type);
}

/**
 * Get component configuration by chart type
 */
export function getComponentConfig(chartType: string): LayerChartComponentConfig | null {
  return LAYERCHART_COMPONENT_REGISTRY[chartType] || null;
}

/**
 * Get all components in a category
 */
export function getComponentsByCategory(
  category: "data-driven" | "hierarchy" | "graph" | "geo" | "radial" | "utility" | "interaction"
): Record<string, LayerChartComponentConfig> {
  return Object.fromEntries(
    Object.entries(LAYERCHART_COMPONENT_REGISTRY).filter(
      ([_, config]) => config.category === category
    )
  );
}

/**
 * Validate if data is compatible with chart type
 */
export function validateDataCompatibility(
  chartType: string,
  data: any[]
): {isValid: boolean; errors: string[]} {
  const config = getComponentConfig(chartType);
  if (!config) {
    return {isValid: false, errors: [`Unknown chart type: ${chartType}`]};
  }

  const errors: string[] = [];

  if (!data || data.length === 0) {
    errors.push("Data array is empty or undefined");
    return {isValid: false, errors};
  }

  const sample = data[0];
  const requiredFields = config.dataRequirements.fields;

  // Check required fields exist in data
  for (const field of requiredFields) {
    if (!(field in sample)) {
      errors.push(`Required field '${field}' missing from data`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
