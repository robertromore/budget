<script lang="ts">
import { Button } from '$lib/components/ui/button';
import Plus from '@lucide/svelte/icons/plus';
import Zap from '@lucide/svelte/icons/zap';

interface Props {
  onCreateNew: () => void;
}

let { onCreateNew }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
  <Zap class="text-muted-foreground mb-4 h-12 w-12" />
  <h3 class="mb-2 text-lg font-semibold">No Automation Rules</h3>
  <p class="text-muted-foreground mb-4 max-w-sm text-sm">
    This account doesn't have any automation rules yet. Create a rule to automatically categorize
    transactions, update payees, or perform other actions based on conditions.
  </p>
  <Button onclick={onCreateNew}>
    <Plus class="mr-2 h-4 w-4" />
    Create Automation Rule
  </Button>
</div>
