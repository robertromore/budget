<script lang="ts">
import { Button } from '$lib/components/ui/button';
import Plus from '@lucide/svelte/icons/plus';
import Wallet from '@lucide/svelte/icons/wallet';

let { accountId, accountSlug }: { accountId: number; accountSlug: string } = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
  <Wallet class="text-muted-foreground mb-4 h-12 w-12" />
  <h3 class="mb-2 text-lg font-semibold">No Budgets</h3>
  <p class="text-muted-foreground mb-4 max-w-sm text-sm">
    This account doesn't have any budgets tracking it yet. Create a budget to monitor and control
    spending.
  </p>
  <Button href={`/budgets/new?accountId=${accountId}&returnTo=/accounts/${accountSlug}`}>
    <Plus class="mr-2 h-4 w-4" />
    Create Budget
  </Button>
</div>
