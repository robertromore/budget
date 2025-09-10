import type { TooltipConfig } from '../config/chart-config';
interface ChartTooltipProps {
    config: TooltipConfig;
    label?: string;
    colors: string[];
    viewModeLabel?: string;
}
/**
 * ChartTooltip
 * Reusable tooltip component for all chart types in the unified chart system.
 * Eliminates code duplication by providing a single, configurable tooltip implementation.
 *
 * Features:
 * - Automatic single/multi-series detection
 * - Smart formatting (currency, percentage, number)
 * - Custom content support
 * - Total calculation for multi-series
 * - Theme-consistent styling
 * - LayerChart integration
 */
declare const ChartTooltip: import("svelte").Component<ChartTooltipProps, {}, "">;
type ChartTooltip = ReturnType<typeof ChartTooltip>;
export default ChartTooltip;
