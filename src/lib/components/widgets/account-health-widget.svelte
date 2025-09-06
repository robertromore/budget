<script lang="ts">
  import type { WidgetProps } from '$lib/types/widgets';
  import { AlertCircle, TrendingDown, TrendingUp } from '$lib/components/icons';
  import WidgetCard from './widget-card.svelte';

  let { config, data, onUpdate, onRemove, editMode = false }: WidgetProps = $props();

  const health = data?.['accountHealth'] ?? {};
  const score = health.score ?? 0;
  const factors = health.factors ?? [];

  // Determine health status
  const getHealthStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const status = getHealthStatus(score);
</script>

<WidgetCard 
  {config} 
  {data} 
  {editMode}
  {...(onUpdate && { onUpdate })}
  {...(onRemove && { onRemove })}
>
  <div class="space-y-3">
    <div class="text-sm font-medium text-muted-foreground">{config.title}</div>

    <!-- Health Score Circle -->
    <div class="flex items-center justify-center">
      <div class="relative w-20 h-20">
        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <!-- Background circle -->
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            stroke-width="8"
            fill="none"
            class="text-muted opacity-20"
          />
          <!-- Progress circle -->
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            stroke-width="8"
            fill="none"
            class={status.color}
            stroke-dasharray={`${2 * Math.PI * 40}`}
            stroke-dashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
            stroke-linecap="round"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <div class="text-lg font-bold">{score}</div>
            <div class="text-xs text-muted-foreground">Score</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Badge -->
    <div class="flex justify-center">
      <span class="px-3 py-1 text-xs font-medium rounded-full {status.bg} {status.color}">
        {status.label}
      </span>
    </div>

    <!-- Health Factors (for medium/large sizes) -->
    {#if (config.size === 'medium' || config.size === 'large') && factors.length > 0}
      <div class="space-y-2 pt-2 border-t">
        {#each factors.slice(0, config.size === 'large' ? 4 : 2) as factor}
          <div class="flex items-center gap-2 text-xs">
            {#if factor.type === 'positive'}
              <TrendingUp class="w-3 h-3 text-green-600" />
            {:else if factor.type === 'negative'}
              <TrendingDown class="w-3 h-3 text-red-600" />
            {:else}
              <AlertCircle class="w-3 h-3 text-yellow-600" />
            {/if}
            <span class="text-muted-foreground">{factor.description}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</WidgetCard>
