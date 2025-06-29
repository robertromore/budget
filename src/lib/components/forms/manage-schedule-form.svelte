<script lang="ts">
  import * as Form from "$lib/components/ui/form";
  import { superForm } from "sveltekit-superforms/client";
  import { zod4Client } from "sveltekit-superforms/adapters";
  import { page } from "$app/state";
  import Input from "$lib/components/ui/input/input.svelte";
  import { insertScheduleSchema, type Schedule } from "$lib/schema/schedules";
  import { SchedulesState } from "$lib/states/schedules.svelte";

  let {
    scheduleId,
    onSave,
  }: {
    scheduleId?: number;
    onDelete?: (id: number) => void;
    onSave?: (new_entity: Schedule) => void;
  } = $props();

  const {
    data: { manageScheduleForm },
  } = page;

  const schedules = SchedulesState.get();

  const form = superForm(manageScheduleForm, {
    id: "schedule-form",
    validators: zod4Client(insertScheduleSchema),
    onResult: async ({ result }) => {
      if (onSave) {
        if (result.type === "success" && result.data) {
          schedules.addSchedule(result.data.entity);
          onSave(result.data.entity);
        }
      }
    },
  });

  const { form: formData, enhance } = form;

  if (scheduleId && scheduleId > 0) {
    $formData.id = scheduleId;
    $formData.name = schedules.getById(scheduleId).name;
  }
</script>

<form method="post" action="/schedules?/save-schedule" use:enhance>
  <input hidden value={$formData.id} name="id" />
  <Form.Field {form} name="name">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Name</Form.Label>
        <Input {...props} bind:value={$formData.name} />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Button>save</Form.Button>
</form>
