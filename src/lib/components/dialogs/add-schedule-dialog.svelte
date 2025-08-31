<script lang="ts">
  import * as Sheet from "$lib/components/ui/sheet";
  import type { UseBoolean } from "$lib/hooks/ui/use-boolean.svelte";
  import type { UseNumber } from "$lib/hooks/ui/use-number.svelte";
  import { managingScheduleId, newScheduleDialog } from "$lib/states/ui/global.svelte";
  import ManageScheduleForm from "../forms/manage-schedule-form.svelte";

  const dialogOpen: UseBoolean = $derived(newScheduleDialog);
  const scheduleId: UseNumber = $derived(managingScheduleId);
</script>

<Sheet.Root bind:open={() => dialogOpen.current, (newOpen) => dialogOpen.current = newOpen}>
  <Sheet.Content preventScroll={false} class="overflow-auto">
    <Sheet.Header>
      <Sheet.Title>{#if scheduleId.current === 0}Add{:else}Manage{/if} Schedule</Sheet.Title>
      <Sheet.Description>
        <ManageScheduleForm scheduleId={scheduleId.current} onSave={() => dialogOpen.current = false} />
      </Sheet.Description>
    </Sheet.Header>
  </Sheet.Content>
</Sheet.Root>
