<script lang="ts">
  import { page } from "$app/state";
  import * as Form from "$lib/components/ui/form";
  import Input from "$lib/components/ui/input/input.svelte";
  import { insertScheduleSchema, type Schedule } from "$lib/schema/schedules";
  import { SchedulesState } from "$lib/stores/entities/schedules.svelte";
  import type { EditableEntityItem } from "$lib/types";
  import HandCoins from "@lucide/svelte/icons/hand-coins";
  import type { Component } from "svelte";
  import { zod4Client } from "sveltekit-superforms/adapters";
  import { superForm } from "sveltekit-superforms/client";
  import EntityInput from "$lib/components/input/entity-input.svelte";
  import SuperDebug from "sveltekit-superforms";
  import MultiNumericInput from "$lib/components/input/multi-numeric-input.svelte";
  import DateInput from "$lib/components/input/date-input.svelte";
  import { getLocalTimeZone, today, type CalendarDate } from "@internationalized/date";
  import Checkbox from "$lib/components/ui/checkbox/checkbox.svelte";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";

  // Props
  let {
    scheduleId,
    onSave,
    onDelete
  }: {
    scheduleId?: number;
    onDelete?: (id: number) => void;
    onSave?: (new_entity: Schedule) => void;
  } = $props();

  // Page data
  const {
    data: { accounts, payees, manageScheduleForm },
  } = page;

  // State
  const schedules = SchedulesState.get();

  let payee: EditableEntityItem = $state({ id: 0, name: "" });
  let account: EditableEntityItem = $state({ id: 0, name: "" });

  // Form
  const form = superForm(manageScheduleForm, {
    id: "schedule-form",
    validators: zod4Client(insertScheduleSchema),
    onResult: async ({ result }) => {
      if (onSave && result.type === "success" && result.data) {
        schedules.addSchedule(result.data.entity);
        onSave(result.data.entity);
      }
    },
  });

  const { form: formData, enhance } = form;

  let amount: number[] = $state([0, 0]);
  let date: CalendarDate = $state(today(getLocalTimeZone()));
  let defaultPayee = $state();
  let defaultAccount = $state();

  $formData.amount_type = "exact";
  $formData.repeating = false;

  // Initialize form data if editing
  if (scheduleId && scheduleId > 0) {
    $formData.id = scheduleId;
    const schedule = schedules.getById(scheduleId);
    $formData.name = schedule.name;
    $formData.payeeId = defaultPayee = schedule.payeeId;
    $formData.accountId = defaultAccount = schedule.accountId;
    $formData.amount_type = schedule.amount_type;
    (() => {
      amount[0] = schedule.amount;
      amount[1] = schedule.amount_2;
    })();
  }

  // Sync selection to form data
  $effect(() => {
    $formData.payeeId = payee.id;
    $formData.accountId = account.id;
    $formData.amount = amount[0];
    $formData.amount_2 = amount[1];
  });
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

  <div class="">
    <Form.Field {form} name="payeeId">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Payee</Form.Label>
          <EntityInput
            entityLabel="payees"
            entities={payees as EditableEntityItem[]}
            defaultValue={defaultPayee}
            bind:value={payee}
            icon={HandCoins as unknown as Component}
            buttonClass="w-full"
          />
          <Form.FieldErrors />
          <input hidden bind:value={$formData.payeeId} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Field {form} name="accountId">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Account</Form.Label>
          <EntityInput
            entityLabel="account"
            entities={accounts as EditableEntityItem[]}
            defaultValue={defaultAccount}
            bind:value={account}
            icon={HandCoins as unknown as Component}
            buttonClass="w-full"
          />
          <Form.FieldErrors />
          <input hidden bind:value={$formData.accountId} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Field {form} name="amount">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Amount</Form.Label>
          <MultiNumericInput
            {...props}
            bind:value={amount}
            bind:type={$formData.amount_type}
          />
          <Form.FieldErrors />
          <input hidden bind:value={$formData.amount} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Field {form} name="amount_2">
      <Form.Control>
        {#snippet children({ props })}
          <input hidden bind:value={$formData.amount_2} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Field {form} name="amount_type">
      <Form.Control>
        {#snippet children({ props })}
          <input hidden bind:value={$formData.amount_type} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <fieldset class="flex flex-col gap-2">
      <legend class="text-sm font-medium">Date</legend>

      <Form.Field {form} name="date">
        <Form.Control>
          {#snippet children({ props })}
            <!-- <Form.Label>Starting Date</Form.Label> -->
            <DateInput
              {...props}
              bind:value={date}
              handleSubmit={(value) => {
                $formData.date = value;
              }}
            />
          {/snippet}
        </Form.Control>
      </Form.Field>

      <Form.Field {form} name="repeating">
        <Form.Control>
          {#snippet children({ props })}
            <Checkbox {...props} bind:checked={$formData.repeating} />
            <Label for={props.id}>Repeating</Label>
          {/snippet}
        </Form.Control>
      </Form.Field>

      {#if $formData.repeating}
        <div class="flex flex-row">
          <span>Repeat every</span>
          <Form.Field {form} name="repeat_every">
            <Form.Control>
              {#snippet children({ props })}
                <Input {...props} class="w-20" type="number" min="1" bind:value={$formData.repeat_every} />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>

          <Form.Field {form} name="email">
            <Form.Control>
              {#snippet children({ props })}
                <Select.Root
                  type="single"
                  bind:value={$formData.repeating_unit}
                  name={props.name}
                >
                  <Select.Trigger {...props}>
                    {$formData.repeating_unit ?? 'day(s)'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="day" label="day(s)" />
                    <Select.Item value="week" label="week(s)" />
                    <Select.Item value="month" label="month(s)" />
                    <Select.Item value="year" label="year(s)" />
                  </Select.Content>
                </Select.Root>
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>
        </div>
      {/if}

    </fieldset>
    <!-- <Form.Field {form} name="date">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Date</Form.Label>
          <RepeatingDateInput
            {...props}
            bind:value={date}
            handleSubmit={(value) => {
              $formData.date = value;
            }}
          />
        {/snippet}
      </Form.Control>
    </Form.Field> -->

    <!-- <div class="flex flex-row items-start space-x-4 my-4">
      <Form.Field {form} name="recurring">
        <Form.Control>
          {#snippet children({ props })}
            <Checkbox
              {...props}
              bind:checked={$formData.recurring}
              name={props.name}
            />
            <Form.Label class="font-normal">Repeats</Form.Label>
          {/snippet}
        </Form.Control>
      </Form.Field>

      <Form.Field {form} name="auto_add">
        <Form.Control>
          {#snippet children({ props })}
            <Checkbox
              {...props}
              bind:checked={$formData.auto_add}
              name={props.name}
            />
            <Form.Label class="font-normal">Auto Add</Form.Label>
          {/snippet}
        </Form.Control>
      </Form.Field>
    </div> -->
  </div>

  <Form.Button>save</Form.Button>
</form>

<!-- <SuperDebug data={$formData} /> -->
