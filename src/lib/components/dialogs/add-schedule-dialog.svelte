<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import type { UseBoolean } from "$lib/hooks/use-boolean.svelte";
  import type { UseNumber } from "$lib/hooks/use-number.svelte";
  import { managingScheduleId, newScheduleDialog } from "$lib/states/global.svelte";
  import ManageScheduleForm from "../forms/manage-schedule-form.svelte";

  const dialogOpen: UseBoolean = $derived(newScheduleDialog);
  const scheduleId: UseNumber = $derived(managingScheduleId);
</script>

<Dialog.Root bind:open={() => dialogOpen.current, (newOpen) => dialogOpen.current = newOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{#if scheduleId.current === 0}Add{:else}Manage{/if} Schedule</Dialog.Title>
      <Dialog.Description>
        <ManageScheduleForm scheduleId={scheduleId.current} onSave={() => dialogOpen.current = false} />
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
