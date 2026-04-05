<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { DashboardWidget } from '$core/schema/dashboards';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Calendar from '@lucide/svelte/icons/calendar';
import Download from '@lucide/svelte/icons/download';
import Users from '@lucide/svelte/icons/users';

let { config }: { config: DashboardWidget } = $props();
</script>

<div class="grid grid-cols-1 gap-2">
  <Button variant="outline" href="/accounts" class="justify-start" size="sm">
    <CreditCard class="mr-2 h-4 w-4" />
    Accounts
  </Button>
  <Button variant="outline" href="/payees" class="justify-start" size="sm">
    <Users class="mr-2 h-4 w-4" />
    Payees
  </Button>
  <Button variant="outline" href="/schedules" class="justify-start" size="sm">
    <Calendar class="mr-2 h-4 w-4" />
    Schedules
  </Button>
</div>
