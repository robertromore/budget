import { chartFormatters } from "@budget-shared/utils";
// Default configurations
export const DEFAULT_AXES_CONFIG = {
    x: {
        show: true,
        title: "",
        rotateLabels: false,
        nice: false,
        domain: [null, null],
        format: (value) => String(value),
        fontSize: "0.75rem",
        fontColor: "hsl(var(--muted-foreground))",
    },
    y: {
        show: true,
        title: "",
        rotateLabels: false,
        nice: true,
        domain: [0, null],
        format: (value) => String(value),
        fontSize: "0.75rem",
        fontColor: "hsl(var(--muted-foreground))",
    },
    secondary: {
        show: false,
        title: "",
        rotateLabels: false,
        nice: true,
        domain: [null, null],
        format: (value) => String(value),
        fontSize: "0.75rem",
        fontColor: "hsl(var(--muted-foreground))",
    },
};
export const DEFAULT_STYLING_CONFIG = {
    colors: "auto",
    theme: "auto",
    dimensions: {
        padding: {
            top: 20,
            right: 30,
            bottom: 80,
            left: 80,
        },
    },
    points: {
        show: false,
        radius: 6,
        fill: "auto",
        stroke: "auto",
        strokeWidth: 1,
        fillOpacity: 1.0,
        strokeOpacity: 1.0,
    },
    grid: {
        show: false,
        horizontal: true,
        vertical: false,
        opacity: 0.5,
    },
    legend: {
        show: false,
        position: "bottom",
        spacing: "normal",
        swatchSize: "medium",
        fontSize: "sm",
    },
    labels: {
        show: false,
        format: (datum) => {
            const value = typeof datum === "object" && datum !== null
                ? (datum.y ?? datum.value ?? datum.amount ?? 0)
                : datum;
            return String(Number(value) || 0);
        },
        placement: "outside",
        class: "text-xs fill-foreground",
        offset: { x: 0, y: 4 },
    },
};
export const DEFAULT_INTERACTIONS_CONFIG = {
    tooltip: {
        enabled: true,
        format: "default",
        position: "pointer",
        xOffset: 10,
        yOffset: 10,
        anchor: "top-left",
        variant: "default",
        showTotal: false,
    },
    highlight: {
        enabled: true,
        axis: "both",
        showPoints: true,
        showLines: true,
        pointRadius: 6,
        lineStyle: "solid",
        lineOpacity: 1.0,
    },
    crosshair: {
        enabled: true,
        axis: "x",
        style: "solid",
        opacity: 0.7,
    },
    zoom: {
        enabled: false,
        resetButton: true,
    },
    pan: {
        enabled: false,
    },
    brush: {
        enabled: false,
    },
};
export const DEFAULT_TIME_FILTERING_CONFIG = {
    enabled: false,
    field: "date",
    defaultPeriod: 0, // All time
    sourceData: [],
    sourceProcessor: (data) => data,
    sourceDateField: "date",
};
export const DEFAULT_THRESHOLD_CONFIG = {
    enabled: true,
    value: 0, // Default threshold at zero (common for profit/loss, positive/negative)
    aboveColor: "hsl(142 71% 45%)", // Green for positive/above
    belowColor: "hsl(350 89% 60%)", // Red for negative/below
    aboveOpacity: 0.3,
    belowOpacity: 0.3,
    useGradient: true,
    showLine: true,
    lineColor: "hsl(var(--muted-foreground))",
    lineStyle: "dashed",
    lineOpacity: 0.5,
    lineWidth: 1,
};
export const DEFAULT_CONTROLS_CONFIG = {
    show: false,
    availableTypes: ["bar", "line", "area"],
    allowTypeChange: true,
    allowPeriodChange: true,
    allowColorChange: false,
    allowCurveChange: false,
    allowPointsChange: false,
    allowViewModeChange: false,
    availableViewModes: ["combined", "side-by-side"],
    allowFontChange: false,
    allowGridChange: false,
    allowCrosshairChange: true,
    allowHighlightChange: false,
    allowLabelChange: false,
    allowThresholdChange: false,
};
export const DEFAULT_ANNOTATIONS_CONFIG = {
    type: "labels",
    labels: {
        show: true,
        format: (datum) => {
            // Extract the numeric value from the data object
            const value = typeof datum === "object" && datum !== null
                ? (datum.y ?? datum.value ?? datum.amount ?? 0)
                : datum;
            return chartFormatters.currency(Number(value) || 0);
        },
        placement: "outside",
        class: "",
        offset: { x: 0, y: 4 },
    },
    rules: {
        show: false,
        values: [],
        orientation: "horizontal",
        class: "stroke-muted-foreground/50",
        strokeWidth: 1,
        strokeDasharray: "2 2",
    },
};
// Smart defaults based on chart type
export const CHART_TYPE_DEFAULTS = {
    bar: {
        styling: {
            dimensions: { padding: { bottom: 80, left: 80 } },
        },
    },
    line: {
        styling: {
            dimensions: { padding: { bottom: 60, left: 80 } },
        },
    },
    area: {
        styling: {
            dimensions: { padding: { bottom: 60, left: 80 } },
        },
    },
    spline: {
        styling: {
            dimensions: { padding: { bottom: 60, left: 80 } },
        },
    },
    pie: {
        styling: {
            legend: { show: true, position: "right" },
            dimensions: { padding: { top: 60, right: 60, bottom: 60, left: 60 } },
        },
        axes: {
            x: { show: false },
            y: { show: false },
        },
    },
    arc: {
        styling: {
            legend: { show: true, position: "right" },
            dimensions: { padding: { top: 60, right: 60, bottom: 60, left: 60 } },
        },
        axes: {
            x: { show: false },
            y: { show: false },
        },
    },
    scatter: {
        styling: {
            dimensions: { padding: { bottom: 80, left: 80 } },
        },
    },
    threshold: {
        styling: {
            dimensions: { padding: { bottom: 80, left: 80 } },
        },
    },
    hull: {
        styling: {
            dimensions: { padding: { bottom: 80, left: 80 } },
        },
    },
    calendar: {
        styling: {
            dimensions: { padding: { top: 20, right: 30, bottom: 40, left: 60 } },
        },
        axes: {
            x: { show: false },
            y: { show: false },
        },
    },
};
// Common configuration presets for financial data
export const FINANCIAL_CHART_PRESETS = {
    balanceTrend: {
        type: "line",
        axes: {
            x: { title: "Date", rotateLabels: true },
            y: { title: "Balance ($)", nice: true },
        },
        styling: {
            colors: ["primary"],
            grid: { show: true, horizontal: true },
        },
        timeFiltering: { enabled: true, field: "date" },
        controls: {
            show: true,
            availableTypes: ["line", "area", "bar"],
            allowPeriodChange: true,
        },
    },
    incomeExpenses: {
        type: "bar",
        axes: {
            x: { title: "Month", rotateLabels: true },
            y: { title: "Amount ($)", nice: true },
        },
        styling: {
            colors: ["success", "destructive"],
            legend: { show: true, position: "top" },
        },
        timeFiltering: { enabled: true, field: "month" },
    },
    categoryBreakdown: {
        type: "pie",
        styling: {
            legend: { show: true, position: "right" },
        },
    },
};
