# Templates Directory

This directory contains reusable templates for generating widgets and chart components in the budget management application.

## Directory Structure

```text
templates/
├── widgets/
│   ├── widget-template.svelte          # Complex chart widgets
│   └── simple-widget-template.svelte   # Simple metric widgets
├── charts/
│   ├── bar-chart-template.svelte       # Bar and grouped charts
│   ├── pie-chart-template.svelte       # Pie and donut charts
│   └── line-chart-template.svelte      # Line and area charts
└── README.md                           # This file
```

## Quick Start

### Generate Widget Component

```bash
bun run generate:widget
```

Interactive prompts for widget configuration:

- Widget name and type selection
- Icon component selection
- Data configuration options
- Automatic registration in widget system

### Generate Chart Component

```bash
bun run generate:chart
```

Interactive prompts for chart configuration:

- Chart component name
- Chart template selection
- Configuration options
- Automatic component indexing

## Template Placeholders

Templates use placeholder replacement for code generation:

### Common Placeholders

- `{{WIDGET_NAME}}` - PascalCase component name
- `{{WIDGET_TYPE}}` - kebab-case identifier
- `{{CHART_TITLE}}` - Display title for charts

### Widget-Specific Placeholders

- `{{ICON_NAME}}` - Icon component name
- `{{METRIC_KEY}}` - Primary data property
- `{{PREVIOUS_METRIC_KEY}}` - Previous value property for trends
- `{{IS_POSITIVE_GOOD}}` - Trend direction preference (boolean)
- `{{ADDITIONAL_INFO}}` - Context information display

### Chart-Specific Placeholders

- `{{PRIMARY_SERIES_LABEL}}` - Main data series label
- `{{SECONDARY_SERIES_LABEL}}` - Secondary data series label

## Template Features

All generated components include:

- **TypeScript Integration** - Proper type definitions and interfaces
- **Theme Support** - CSS variables for consistent styling
- **Responsive Design** - Multiple size options and breakpoints
- **Accessibility** - ARIA labels, descriptions, and keyboard navigation
- **Error Handling** - Graceful handling of missing or invalid data
- **LayerChart Integration** - Professional data visualization components
- **Svelte 5 Compatibility** - Modern runes-based reactive patterns

## Template Types

### Widget Templates

**Complex Widgets** (`widget-template.svelte`):

- Full chart integration with LayerChart
- Multiple size configurations
- Legend and summary statistics
- Interactive controls and filtering

**Simple Widgets** (`simple-widget-template.svelte`):

- Single metric display with trend calculation
- Icon-based visual identity
- Automatic change percentage calculation
- Minimal configuration requirements

### Chart Templates

**Bar Chart Template** (`bar-chart-template.svelte`):

- Bar and grouped bar chart configurations
- Horizontal and vertical orientations
- Multiple data series support

**Pie Chart Template** (`pie-chart-template.svelte`):

- Pie and donut chart variations
- Legend and label positioning
- Category breakdown visualizations

**Line Chart Template** (`line-chart-template.svelte`):

- Line and area chart options
- Time series data support
- Trend analysis capabilities

## Development Workflow

1. **Template Selection** - Choose appropriate template type
2. **Interactive Configuration** - Provide component details through prompts
3. **Code Generation** - Automatic placeholder replacement and file creation
4. **System Registration** - Automatic updates to registries and type definitions
5. **Integration** - Ready-to-use components in the application

## See Also

- [Template System Guide](../docs/technical/template-system.md) - Comprehensive implementation guide
- [Widget System Architecture](../docs/technical/template-system.md#widget-system-architecture) - Architecture patterns
- [Development Guidelines](../docs/development/guidelines.md) - Component development standards
