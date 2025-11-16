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
    class="bg-green-100 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-200">
    <Receipt class="mr-1 h-3 w-3" />
    Yes
  </Badge>
{:else}
  <span class="text-muted-foreground">—</span>
{/if}
