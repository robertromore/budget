<script lang="ts">
import * as Sheet from '$lib/components/ui/sheet';
import type {UseBoolean} from '$lib/hooks/ui/use-boolean.svelte';
import type {UseNumber} from '$lib/hooks/ui/use-number.svelte';
import {managingScheduleId, newScheduleDialog, duplicatingSchedule} from '$lib/states/ui/global.svelte';
import {ManageScheduleForm} from '$lib/components/forms';
import {goto} from '$app/navigation';
import type {Schedule} from '$lib/schema/schedules';

const dialogOpen: UseBoolean = $derived(newScheduleDialog);
const scheduleId: UseNumber = $derived(managingScheduleId);

async function handleSave(savedSchedule?: Schedule) {
  dialogOpen.current = false;

  // If we're duplicating and have a saved schedule, navigate to it
  if (duplicatingSchedule.current && savedSchedule) {
    await goto(`/schedules/${savedSchedule.slug}`);
  }

  // Reset duplication mode when dialog closes
  duplicatingSchedule.current = false;
}
</script>

<Sheet.Root bind:open={dialogOpen.current} onOpenChange={(open) => {
  dialogOpen.current = open;
  if (!open) {
    // Reset duplication mode when dialog closes
    duplicatingSchedule.current = false;
  }
}}>
  <Sheet.Content preventScroll={false} class="overflow-auto sm:max-w-lg">
    <Sheet.Header>
      <Sheet.Title>
        {#if duplicatingSchedule.current}
          Duplicate Schedule
        {:else if scheduleId.current === 0}
          Add Schedule
        {:else}
          Manage Schedule
        {/if}
      </Sheet.Title>
      <Sheet.Description>
        <ManageScheduleForm
          scheduleId={scheduleId.current}
          duplicateMode={duplicatingSchedule.current}
          onSave={handleSave} />
      </Sheet.Description>
    </Sheet.Header>
  </Sheet.Content>
</Sheet.Root>
