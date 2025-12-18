<script lang="ts">
import { Button } from '$lib/components/ui/button';
import Calendar from '@lucide/svelte/icons/calendar';
import Plus from '@lucide/svelte/icons/plus';

let { accountId, accountSlug }: { accountId: number; accountSlug: string } = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
  <Calendar class="text-muted-foreground mb-4 h-12 w-12" />
  <h3 class="mb-2 text-lg font-semibold">No Schedules</h3>
  <p class="text-muted-foreground mb-4 max-w-sm text-sm">
    This account doesn't have any recurring schedules yet. Create a schedule to automatically track
    regular transactions.
  </p>
  <Button href={`/schedules/new?accountId=${accountId}&returnTo=/accounts/${accountSlug}`}>
    <Plus class="mr-2 h-4 w-4" />
    Create Schedule
  </Button>
</div>
