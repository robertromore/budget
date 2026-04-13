<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import Receipt from '@lucide/svelte/icons/receipt';

interface Props {
  isTaxDeductible: boolean;
}

let { isTaxDeductible }: Props = $props();
</script>

{#if isTaxDeductible}
  <Badge
    variant="secondary"
    class="bg-success-bg text-xs text-success-fg">
    <Receipt class="mr-1 h-3 w-3" />
    Yes
  </Badge>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
