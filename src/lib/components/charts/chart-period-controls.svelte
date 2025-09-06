<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import type { Option } from '$lib/utils/options';

  interface Props {
    currentPeriod?: string | number;
    data: Option[];
    dateField?: string;
    enablePeriodFiltering?: boolean;
  }

  let { 
    currentPeriod = $bindable(0),
    data,
    dateField = 'month',
    enablePeriodFiltering = false
  }: Props = $props();
</script>

<!-- Period Controls -->
{#if enablePeriodFiltering && data.length > 0}
  <div class="flex items-center gap-2">
    <span class="font-medium">Period:</span>
    <div class="flex gap-1">
      {#each data as period}
        <Button
          variant={currentPeriod === period.key ? 'default' : 'outline'}
          size="sm"
          onclick={() => currentPeriod = period.key}
        >
          {period.label}
        </Button>
      {/each}
    </div>
  </div>
{/if}