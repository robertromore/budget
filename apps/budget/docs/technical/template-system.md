# Template System Guide

This guide covers the comprehensive template system for generating widgets and chart components in the budget application.

## Overview

The template system provides:

- **Widget Templates**: Generate complete dashboard widgets with data integration
- **Chart Templates**: Create reusable chart components for data visualization
- **CLI Generators**: Interactive command-line tools for automated code generation
- **Type Safety**: Full TypeScript integration with proper type definitions

## Quick Start

### Generate a Widget

```bash
bun run generate:widget
```

Prompts you for:
- Widget name (e.g., "Balance Trend")
- Widget type (simple metric or complex chart widget)
- Icon component (for simple widgets)
- Data configuration

### Generate a Chart

```bash
bun run generate:chart
```

Prompts you for:
- Chart component name
- Chart template (bar/pie/line)
- Chart configuration options

## Widget System Architecture

### Widget Types

#### Simple Widget
- Single metric display with trend calculation
- Icon-based visual identity
- Minimal configuration
- Automatic change percentage calculation

#### Complex Widget
- Full chart integration with LayerChart
- Multiple size options (small/medium/large)
- Configurable chart types
- Legend and summary statistics

### Data Flow

```
Database → Widget Store → calculateWidgetData() → Widget Component → UI
```

## Templates Structure

### Widget Templates

#### Location
- `templates/widgets/widget-template.svelte` - Complex chart widgets
- `templates/widgets/simple-widget-template.svelte` - Simple metric widgets

#### Placeholders
- `{{WIDGET_NAME}}` - PascalCase widget name
- `{{WIDGET_TYPE}}` - kebab-case widget identifier
- `{{DATA_KEY}}` - Data property key for widget data
- `{{ICON_NAME}}` - Icon component name
- `{{METRIC_KEY}}` - Primary metric property
- `{{PREVIOUS_METRIC_KEY}}` - Previous period metric for trends

#### Example Usage

```svelte
<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import WidgetCard from './widget-card.svelte';
  import { DollarSign } from '$lib/components/icons';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const currentValue = data?.balance ?? 0;
  const previousValue = data?.previousBalance ?? 0;
</script>
```

### Chart Templates

#### Location
- `templates/charts/bar-chart-template.svelte` - Bar and grouped bar charts
- `templates/charts/pie-chart-template.svelte` - Pie and donut charts
- `templates/charts/line-chart-template.svelte` - Line and area charts

#### Features
- Chart type switching (bar/line/area, pie/donut/bar)
- Interactive controls and statistics
- Responsive legends and summaries
- Theme integration with CSS variables

#### Data Structure

**Bar Chart:**
```typescript
data: Array<{
  category: string;
  value: number;
  secondaryValue?: number;
  color?: string;
}>
```

**Pie Chart:**
```typescript
data: Array<{
  name: string;
  value: number;
  color?: string;
}>
```

**Line Chart:**
```typescript
data: Array<{
  date: string;
  value: number;
  label?: string;
}>
```

## Generator Scripts

### Widget Generator (`scripts/generate-widget.js`)

#### Features
- Interactive prompts for widget configuration
- Template selection (simple vs complex)
- Automatic file generation and registration
- Widget registry updates
- Type definition updates

#### Generated Files
- Widget component: `src/lib/components/widgets/{widget-type}-widget.svelte`
- Registry update: `src/lib/components/widgets/widget-registry.ts`
- Type update: `src/lib/types/widgets.ts`

#### Process
1. Prompts for widget information
2. Selects appropriate template
3. Replaces placeholders with user input
4. Generates widget component file
5. Updates widget registry with import and component entry
6. Adds widget type to TypeScript definitions
7. Creates widget definition in WIDGET_DEFINITIONS

### Chart Generator (`scripts/generate-chart.js`)

#### Features
- Template-based chart generation
- Chart type validation
- Component index updates
- Customizable chart configuration

#### Generated Files
- Chart component: `src/lib/components/charts/{chart-name}.svelte`
- Index update: `src/lib/components/charts/index.ts`

## Integration Patterns

### Widget Integration

1. **Data Provider**: Add data calculation to `calculateWidgetData()` in widget store
2. **Widget Registration**: Automatically handled by generator
3. **Default Widgets**: Manually add to `DEFAULT_WIDGETS` array if needed

### Chart Integration

1. **Import Pattern**: `import { ChartName } from '$lib/components/charts';`
2. **Usage**: Pass appropriate data structure as props
3. **Styling**: Uses theme CSS variables automatically

## Best Practices

### Widget Development

- **Follow naming conventions**: Use descriptive, domain-specific names
- **Implement error states**: Handle missing or invalid data gracefully
- **Use theme variables**: Maintain consistency with CSS variables
- **Optimize data calculations**: Cache expensive computations with `$derived`

### Chart Development

- **Validate data structures**: Ensure data matches expected format
- **Support responsive design**: Use appropriate sizing for different layouts
- **Include accessibility**: Add proper ARIA labels and descriptions
- **Performance considerations**: Limit data points for smooth rendering

### Code Quality

- **TypeScript first**: Use proper type definitions throughout
- **Component composition**: Break complex widgets into smaller components
- **State management**: Use Svelte 5 runes efficiently
- **Testing**: Include unit tests for business logic

## Customization Guide

### Modifying Templates

1. **Edit template files** in `templates/` directory
2. **Update placeholders** as needed for new features
3. **Test with generators** to ensure proper replacement
4. **Document new placeholders** in this guide

### Adding New Templates

1. **Create template file** in appropriate subdirectory
2. **Update generator script** to support new template
3. **Add validation** for template selection
4. **Update documentation** with usage examples

### Extending Generators

1. **Add new prompt questions** for additional configuration
2. **Implement new placeholder replacements**
3. **Update file generation logic**
4. **Add new npm scripts** to package.json

## Troubleshooting

### Common Issues

#### Generator Errors
- **File permissions**: Ensure scripts are executable with `chmod +x`
- **Node.js path**: Verify Node.js is available in PATH
- **Missing templates**: Check template files exist in `templates/` directory

#### Widget Registration
- **Import errors**: Verify widget registry imports are correct
- **Type errors**: Ensure widget type is added to WidgetType union
- **Missing data**: Add data calculation to widget store

#### Chart Rendering
- **Data format**: Verify data structure matches chart expectations
- **Container sizing**: Ensure parent container has appropriate dimensions
- **LayerChart integration**: Check LayerChart component imports

### Debug Steps

1. **Check console errors** in browser developer tools
2. **Verify file generation** completed successfully
3. **Review generated imports** in registry and index files
4. **Test with minimal data** to isolate issues

## Examples

### Creating a Simple Balance Widget

```bash
bun run generate:widget
# Widget name: Current Balance
# Simple widget: y
# Icon: DollarSign
# Data key: balance
# Positive change good: y
```

### Creating a Spending Trend Chart

```bash
bun run generate:chart
# Chart name: Monthly Spending Trend
# Template: line
# Title: Monthly Spending Trend
# Period: month
```

### Using Generated Components

```svelte
<script lang="ts">
  import { CurrentBalanceWidget } from '$lib/components/widgets';
  import { MonthlySpendingTrend } from '$lib/components/charts';
</script>

<CurrentBalanceWidget
  config={{ title: "Current Balance", type: "current-balance" }}
  data={{ balance: 1250.50, previousBalance: 1180.25 }}
/>

<MonthlySpendingTrend
  data={[
    { date: "2025-01", value: 2340.50 },
    { date: "2025-02", value: 2156.75 }
  ]}
  title="Monthly Spending"
/>
```

## Future Enhancements

### Planned Features
- **Template versioning**: Support multiple template versions
- **Component previews**: Generate preview files for testing
- **Theme customization**: Template-based theme generation
- **Batch generation**: Generate multiple components at once

### Integration Opportunities
- **Storybook integration**: Auto-generate stories for components
- **Testing integration**: Generate test files with components
- **Documentation generation**: Auto-create component documentation
- **CI/CD integration**: Template validation in build process

---

This template system provides a robust foundation for scalable widget and chart development in the budget application. The combination of interactive generators, comprehensive templates, and automatic integrations ensures consistent, maintainable code while accelerating development velocity.
