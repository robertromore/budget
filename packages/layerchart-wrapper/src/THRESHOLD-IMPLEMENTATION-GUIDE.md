# LayerChart Threshold Implementation Guide

## Understanding the LayerChart Threshold Component

The LayerChart Threshold component uses ClipPath internally to create clipping regions that show different colors above and below a threshold value. It's essential to understand how it works to implement it correctly.

### How Threshold Works

1. The Threshold component creates two clipping regions using the chart's data
2. The `above` snippet renders content that's clipped to show only above the threshold
3. The `below` snippet renders content that's clipped to show only below the threshold
4. The Threshold component itself doesn't render any visual elements - it only sets up clipping

### Key Points About the API

- The Threshold component does NOT accept a `y` prop for the threshold value
- Instead, you control the threshold line using `y0` and `y1` props on Area components within the snippets
- The threshold value should be passed to Area components, not to Threshold itself

## Correct Implementation Pattern

### 1. Basic Threshold with Area Chart

```svelte
<Chart data={data} x="x" y="y">
  <Svg>
    <!-- Threshold background areas -->
    <Threshold>
      {#snippet above()}
        <!-- Area fills region ABOVE threshold -->
        <Area 
          y0={0}  <!-- Threshold value -->
          fill="hsl(142 71% 45%)"  <!-- Green for positive -->
          fillOpacity={0.15}
        />
      {/snippet}
      
      {#snippet below()}
        <!-- Area fills region BELOW threshold -->
        <Area 
          y1={0}  <!-- Threshold value -->
          fill="hsl(350 89% 60%)"  <!-- Red for negative -->
          fillOpacity={0.15}
        />
      {/snippet}
    </Threshold>
    
    <!-- Main area chart on top -->
    <Area 
      fill="hsl(217 91% 60%)"
      fillOpacity={0.6}  <!-- Semi-transparent to show threshold colors -->
      stroke="hsl(217 91% 60%)"
      strokeWidth={2}
    />
    
    <!-- Threshold line -->
    <Rule 
      y={0}
      stroke="hsl(var(--muted-foreground))"
      strokeDasharray="4 2"
    />
  </Svg>
</Chart>
```

### 2. Line Chart with Threshold Background

```svelte
<Threshold>
  {#snippet above()}
    <Area 
      y0={thresholdValue}
      fill="green"
      fillOpacity={0.1}
    />
  {/snippet}
  
  {#snippet below()}
    <Area 
      y1={thresholdValue}
      fill="red"
      fillOpacity={0.1}
    />
  {/snippet}
</Threshold>

<!-- Line chart renders on top -->
<Line stroke="blue" strokeWidth={2} />
```

## Common Issues and Solutions

### Issue 1: Threshold Colors Not Showing

**Problem**: The threshold areas render but don't show the expected colors.

**Solution**: 
- Ensure `y0` (for above) and `y1` (for below) are set on Area components inside snippets
- Use lower opacity (0.1-0.2) for threshold areas
- Make sure the main chart has some transparency to show threshold colors underneath

### Issue 2: Area Chart Covers Threshold

**Problem**: The area chart completely covers the threshold visualization.

**Solution**:
- Reduce the area chart's `fillOpacity` to 0.5-0.7
- Render threshold BEFORE the main chart (order matters)
- Use distinct colors for threshold vs main chart

### Issue 3: No Visual Separation

**Problem**: Can't see the threshold line or distinction between regions.

**Solution**:
- Add a Rule component with the threshold value
- Use contrasting colors (green/red) for above/below
- Increase opacity difference between threshold areas and main chart

## Opacity Guidelines

For best visual results:

- **Threshold areas**: 0.1-0.2 opacity (subtle background)
- **Area charts**: 0.5-0.7 opacity (allows threshold to show through)
- **Line charts**: 1.0 opacity (no fill, just stroke)
- **Threshold line**: 0.5-0.7 opacity with dashed style

## Color Recommendations

### Financial Data
- **Above threshold (positive)**: `hsl(142 71% 45%)` (green)
- **Below threshold (negative)**: `hsl(350 89% 60%)` (red)
- **Neutral/main chart**: `hsl(217 91% 60%)` (blue)

### Performance Data
- **Above threshold (good)**: `hsl(142 71% 45%)` (green)
- **Below threshold (poor)**: `hsl(25 95% 53%)` (orange)
- **Main chart**: `hsl(217 91% 60%)` (blue)

## Dynamic Threshold Configuration

```typescript
interface ThresholdConfig {
  enabled: boolean;
  value: number;
  aboveColor: string;
  belowColor: string;
  aboveOpacity: number;
  belowOpacity: number;
  showLine: boolean;
  lineColor: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  lineOpacity: number;
  lineWidth: number;
}

// Default configuration
const DEFAULT_THRESHOLD = {
  enabled: true,
  value: 0,
  aboveColor: 'hsl(142 71% 45%)',
  belowColor: 'hsl(350 89% 60%)',
  aboveOpacity: 0.15,
  belowOpacity: 0.15,
  showLine: true,
  lineColor: 'hsl(var(--muted-foreground))',
  lineStyle: 'dashed',
  lineOpacity: 0.5,
  lineWidth: 1
};
```

## Testing Your Implementation

1. Create a dataset with both positive and negative values
2. Set threshold to 0 or median value
3. Verify you can see:
   - Different colors above/below threshold
   - The main chart line/area
   - The threshold line
4. Adjust opacities if any element is not visible

## Advanced Patterns

### Multiple Thresholds

For multiple threshold levels, layer them with decreasing opacity:

```svelte
<!-- First threshold -->
<Threshold>
  {#snippet above()}
    <Area y0={highThreshold} fill="green" fillOpacity={0.1} />
  {/snippet}
</Threshold>

<!-- Second threshold -->
<Threshold>
  {#snippet above()}
    <Area y0={lowThreshold} fill="yellow" fillOpacity={0.1} />
  {/snippet}
  {#snippet below()}
    <Area y1={lowThreshold} fill="red" fillOpacity={0.1} />
  {/snippet}
</Threshold>
```

### Gradient Thresholds

For smooth color transitions:

```svelte
<defs>
  <linearGradient id="threshold-gradient" y1="0%" y2="100%">
    <stop offset="0%" stop-color="green" stop-opacity="0.3" />
    <stop offset="50%" stop-color="transparent" />
    <stop offset="100%" stop-color="red" stop-opacity="0.3" />
  </linearGradient>
</defs>

<rect 
  x={0} 
  y={0} 
  width="100%" 
  height="100%" 
  fill="url(#threshold-gradient)" 
/>
```

## Summary

The key to successful threshold implementation is:

1. Use Threshold component for clipping, not direct rendering
2. Set threshold values on Area components with `y0`/`y1`
3. Layer components correctly: threshold background → main chart → threshold line
4. Use appropriate opacity values for each layer
5. Choose contrasting colors for clear visual distinction