# Threshold examples

## Area Chart

```svelte
{@const colors = {
  positive: "var(--color-success)",
  negative: "var(--color-danger)",
}}

<div class="h-[300px] p-4 border rounded-sm">
  <AreaChart
    data={negativeDateSeriesData}
    x="date"
    y="value"
    {renderContext}
    {debug}
  >
    {#snippet marks({ context })}
      {@const thresholdValue = 0}
      {@const thresholdOffset =
        context.yScale(thresholdValue) /
        (context.height + context.padding.bottom)}
      <LinearGradient
        stops={[
          [thresholdOffset, colors.positive],
          [thresholdOffset, colors.negative],
        ]}
        units="userSpaceOnUse"
        vertical
      >
        {#snippet children({ gradient })}
          <Area
            y0={(d) => thresholdValue}
            line={{ stroke: gradient }}
            fill={gradient}
            fillOpacity={0.2}
          />
        {/snippet}
      </LinearGradient>
    {/snippet}

    {#snippet highlight({ context })}
      {@const value = context.tooltip?.data && context.y(context.tooltip?.data)}
      <Highlight
        lines
        points={{ fill: value < 0 ? colors.negative : colors.positive }}
      />
    {/snippet}
    {#snippet tooltip({ context })}
      <Tooltip.Root>
        {#snippet children({ data })}
          {@const value = context.y(data)}
          <Tooltip.Header>{format(context.x(data), "day")}</Tooltip.Header>
          <Tooltip.List>
            <Tooltip.Item
              label="value"
              value={context.y(data)}
              color={value < 0 ? colors.negative : colors.positive}
            />
          </Tooltip.List>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </AreaChart>
</div>
```

## Line Chart

```svelte
<div class="h-[300px] p-4 border rounded-sm">
  <LineChart
    data={data.dailyTemperature}
    x="date"
    y="value"
    yDomain={null}
    {renderContext}
    {debug}
  >
    {#snippet marks({ context })}
      {@const thresholdOffset =
        context.yScale(50) / (context.height + context.padding.bottom)}
      <LinearGradient
        stops={[
          [thresholdOffset, "var(--color-danger)"],
          [thresholdOffset, "var(--color-info)"],
        ]}
        units="userSpaceOnUse"
        vertical
      >
        {#snippet children({ gradient })}
          <Spline stroke={gradient} />
        {/snippet}
      </LinearGradient>
    {/snippet}

    {#snippet highlight({ context })}
      {#if context.tooltip.data}
        <Highlight
          lines
          points={{
            fill:
              context.y(context.tooltip.data) > 50
                ? "var(--color-danger)"
                : "var(--color-info)",
          }}
        />
      {/if}
    {/snippet}

    {#snippet tooltip({ context })}
      <Tooltip.Root>
        {#snippet children({ data })}
          {@const value = context.y(data)}
          <Tooltip.Header>{format(context.x(data))}</Tooltip.Header>
          <Tooltip.List>
            <Tooltip.Item
              label="value"
              {value}
              color={value > 50 ? "var(--color-danger)" : "var(--color-info)"}
            />
          </Tooltip.List>
        {/snippet}
      </Tooltip.Root>
    {/snippet}
  </LineChart>
</div>
```

## Bar Chart

```svelte
<div class="h-[300px] p-4 border rounded-sm">
  <BarChart
    data={negativeData}
    x="date"
    y="value"
    c="value"
    cScale={scaleThreshold()}
    cDomain={[0]}
    cRange={["var(--color-danger)", "var(--color-success)"]}
    {renderContext}
    {debug}
  />
</div>
```

## Scatter Chart

```svelte
<div class="h-[400px] p-4 border rounded-sm">
  <ScatterChart
    data={dateSeriesData}
    x="date"
    y="value"
    yBaseline={0}
    c="value"
    cScale={scaleThreshold()}
    cDomain={[50]}
    cRange={["var(--color-danger)", "var(--color-success)"]}
    {renderContext}
    {debug}
  />
</div>
```
