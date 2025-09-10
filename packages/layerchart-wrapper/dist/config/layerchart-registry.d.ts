import type { Component } from "svelte";
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
export declare const LAYERCHART_COMPONENT_REGISTRY: Record<string, LayerChartComponentConfig>;
/**
 * Get available chart types based on data format and requirements
 */
export declare function getAvailableChartTypes(dataFormat: "xy" | "hierarchical" | "graph" | "geo" | "categorical", features?: string[]): string[];
/**
 * Get component configuration by chart type
 */
export declare function getComponentConfig(chartType: string): LayerChartComponentConfig | null;
/**
 * Get all components in a category
 */
export declare function getComponentsByCategory(category: "data-driven" | "hierarchy" | "graph" | "geo" | "radial" | "utility" | "interaction"): Record<string, LayerChartComponentConfig>;
/**
 * Validate if data is compatible with chart type
 */
export declare function validateDataCompatibility(chartType: string, data: any[]): {
    isValid: boolean;
    errors: string[];
};
