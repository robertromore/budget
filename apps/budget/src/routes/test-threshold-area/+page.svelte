<script lang="ts">
  import { Chart, Svg, Area, Threshold, Rule, Axis, Grid } from 'layerchart';
  import { curveStep } from 'd3-shape';
  
  // Generate sample data with positive and negative values
  const data = Array.from({ length: 50 }, (_, i) => ({
    x: i,
    y: Math.sin(i / 5) * 30 + Math.random() * 10 - 5
  }));
  
  const thresholdValue = 0;
</script>

<div class="p-8 space-y-8">
  <h1 class="text-2xl font-bold">Threshold with Area Chart Test</h1>
  
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">Approach 1: Threshold with Area snippets (Your Current Approach)</h2>
    <div class="h-[300px] border rounded">
      <Chart {data} x="x" y="y" yNice padding={{ top: 20, bottom: 40, left: 40, right: 20 }}>
        <Svg>
          <Grid vertical horizontal />
          <Axis placement="left" />
          <Axis placement="bottom" />
          
          <!-- Threshold component with above/below areas -->
          <Threshold y={thresholdValue}>
            {#snippet above()}
              <Area 
                fill="hsl(142 71% 45%)" 
                fillOpacity={0.3}
              />
            {/snippet}
            {#snippet below()}
              <Area 
                fill="hsl(350 89% 60%)" 
                fillOpacity={0.3}
              />
            {/snippet}
          </Threshold>
          
          <!-- Main area chart on top -->
          <Area 
            fill="hsl(217 91% 60%)"
            fillOpacity={0.7}
            stroke="hsl(217 91% 60%)"
            strokeWidth={2}
          />
          
          <!-- Threshold line -->
          <Rule 
            y={thresholdValue} 
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="4 2"
            opacity={0.5}
          />
        </Svg>
      </Chart>
    </div>
  </div>
  
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">Approach 2: Area with gradient (Alternative)</h2>
    <div class="h-[300px] border rounded">
      <Chart {data} x="x" y="y" yNice padding={{ top: 20, bottom: 40, left: 40, right: 20 }}>
        <Svg>
          <Grid vertical horizontal />
          <Axis placement="left" />
          <Axis placement="bottom" />
          
          <!-- Define gradient for threshold coloring -->
          <defs>
            <linearGradient id="threshold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="hsl(142 71% 45%)" stop-opacity="0.5" />
              <stop offset="50%" stop-color="hsl(217 91% 60%)" stop-opacity="0.5" />
              <stop offset="100%" stop-color="hsl(350 89% 60%)" stop-opacity="0.5" />
            </linearGradient>
          </defs>
          
          <!-- Single area with gradient fill -->
          <Area 
            fill="url(#threshold-gradient)"
            stroke="hsl(217 91% 60%)"
            strokeWidth={2}
          />
          
          <!-- Threshold line -->
          <Rule 
            y={thresholdValue} 
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="4 2"
            opacity={0.5}
          />
        </Svg>
      </Chart>
    </div>
  </div>
  
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">Approach 3: Correct Threshold Implementation</h2>
    <div class="h-[300px] border rounded">
      <Chart {data} x="x" y="y" yNice padding={{ top: 20, bottom: 40, left: 40, right: 20 }}>
        <Svg>
          <Grid vertical horizontal />
          <Axis placement="left" />
          <Axis placement="bottom" />
          
          <!-- Threshold fills ONLY the threshold areas, not the full chart -->
          <Threshold y={thresholdValue}>
            {#snippet above()}
              <!-- This Area only fills ABOVE the threshold line -->
              <Area 
                fill="hsl(142 71% 45%)" 
                fillOpacity={0.2}
              />
            {/snippet}
            {#snippet below()}
              <!-- This Area only fills BELOW the threshold line -->
              <Area 
                fill="hsl(350 89% 60%)" 
                fillOpacity={0.2}
              />
            {/snippet}
          </Threshold>
          
          <!-- Main area chart with its own styling -->
          <Area 
            fill="hsl(217 91% 60%)"
            fillOpacity={0.4}
            stroke="hsl(217 91% 60%)"
            strokeWidth={2}
          />
          
          <!-- Threshold line -->
          <Rule 
            y={thresholdValue} 
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="4 2"
            opacity={0.7}
          />
        </Svg>
      </Chart>
    </div>
  </div>
  
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">Approach 4: Line Chart with Threshold Fill</h2>
    <div class="h-[300px] border rounded">
      <Chart {data} x="x" y="y" yNice padding={{ top: 20, bottom: 40, left: 40, right: 20 }}>
        <Svg>
          <Grid vertical horizontal />
          <Axis placement="left" />
          <Axis placement="bottom" />
          
          <!-- Threshold background areas -->
          <Threshold y={thresholdValue}>
            {#snippet above()}
              <Area 
                fill="hsl(142 71% 45%)" 
                fillOpacity={0.15}
              />
            {/snippet}
            {#snippet below()}
              <Area 
                fill="hsl(350 89% 60%)" 
                fillOpacity={0.15}
              />
            {/snippet}
          </Threshold>
          
          <!-- Line chart instead of area -->
          <Area 
            fill="none"
            stroke="hsl(217 91% 60%)"
            strokeWidth={2}
          />
          
          <!-- Threshold line -->
          <Rule 
            y={thresholdValue} 
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="4 2"
            opacity={0.5}
          />
        </Svg>
      </Chart>
    </div>
  </div>
</div>