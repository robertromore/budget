<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js';
  import type { Schedule } from '$lib/schema/schedules.js';
  import { managingScheduleId, newScheduleDialog } from '$lib/stores/ui/global.svelte';

  let { data } = $props();
  const schedules: Schedule[] | undefined = $derived(data.schedules);
</script>

<div class="flex items-center justify-between py-4">
  <h1 class="text-3xl font-bold">Schedules</h1>
  <Button onclick={() => {
    managingScheduleId.current = 0;
    newScheduleDialog.current = true;
  }}>Add Schedule</Button>
</div>

{#each schedules as schedule}
  <div class="schedule">
    <h2>{schedule.name}</h2>
  </div>
{/each}
