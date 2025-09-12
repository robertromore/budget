<script lang="ts">
import {Button} from '$lib/components/ui/button';
import type {Schedule} from '$lib/schema/schedules.js';
import {managingScheduleId, newScheduleDialog} from '$lib/states/ui/global.svelte';

let {data} = $props();
const schedules: Schedule[] | undefined = $derived(data.schedules);
</script>

<Button
  onclick={() => {
    managingScheduleId.current = 0;
    newScheduleDialog.current = true;
  }}>Add Schedule</Button>

{#each schedules as schedule}
  <div class="schedule">
    <h2>{schedule.name}</h2>
  </div>
{/each}
