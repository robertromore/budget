# Claude Code Configuration - Charts Components

This file contains specific configuration and preferences for Claude Code agents working on the charts components.

## Svelte 5 Derived Patterns

**ALWAYS use `$derived.by()` pattern over `$derived()` pattern for complex computations.**

### Preferred Pattern

```typescript
// ✅ Use $derived.by() - no function invocation needed
const chartData = $derived.by(() => {
  // Complex computation logic
  return processedData;
});

// ✅ Reference directly without calling as function
{chartData}
```

### Avoid Pattern

```typescript
// ❌ Avoid $derived() - requires function invocation
const chartData = $derived(() => {
  // Complex computation logic  
  return processedData;
});

// ❌ Must call as function - creates confusion
{chartData()}
```

### Benefits of $derived.by()

- **Cleaner template syntax**: Reference values directly without `()`
- **Better readability**: Clear distinction between reactive values and functions
- **Consistent patterns**: Matches other Svelte 5 runes like `$state`
- **Reduced cognitive load**: No need to remember which values need function calls

### When to Use Each

- **$derived.by()**: Complex computations, data transformations, multi-step logic
- **$derived()**: Simple expressions, single-line computations where function call syntax is acceptable

### Chart-Specific Examples

```typescript
// ✅ Chart data processing
const processedData = $derived.by(() => {
  if (!data || data.length === 0) return [];
  return transformDataForChartType(data, chartType);
});

// ✅ Multi-series data
const seriesData = $derived.by(() => {
  if (!isMultiSeries) return [];
  return yFields.map(field => data.map(item => ({...item, y: item[field]})));
});

// ✅ Component configuration
const chartConfig = $derived.by(() => {
  const config = getComponentConfig(chartType);
  return config ? {...config, ...userOverrides} : null;
});
```

This pattern ensures consistent, readable code across all chart components and reduces the likelihood of forgetting function invocations in templates.