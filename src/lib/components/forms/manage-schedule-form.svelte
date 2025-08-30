<script lang="ts">
  import { page } from "$app/state";
  import * as Form from "$lib/components/ui/form";
  import Input from "$lib/components/ui/input/input.svelte";
  import { scheduleFormSchema } from "$lib/schema/forms";
  import { type Schedule } from "$lib/schema/schedules";
  import { SchedulesState } from "$lib/stores/entities/schedules.svelte";
  import type { EditableEntityItem } from "$lib/types";
  import HandCoins from "@lucide/svelte/icons/hand-coins";
  import type { Component } from "svelte";
  import { zod4Client } from "sveltekit-superforms/adapters";
  import { superForm } from "sveltekit-superforms/client";
  import EntityInput from "../input/entity-input.svelte";
  import SuperDebug from "sveltekit-superforms";
  import MultiNumericInput from "../input/multi-numeric-input.svelte";
  import RepeatingDateInput from "$lib/components/input/repeating-date-input.svelte";
  import RepeatingDateInputModel from "$lib/models/repeating_date.svelte";

  // Props
  let {
    scheduleId,
    onSave,
  }: {
    scheduleId?: number;
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
  let repeating_date = $state(new RepeatingDateInputModel());

  // Form
  const form = superForm(manageScheduleForm, {
    id: "schedule-form",
    onResult: async ({ result }) => {
      if (onSave && result.type === "success" && result.data) {
        schedules.addSchedule(result.data.entity);
        onSave(result.data.entity);
      }
    },
  });

  const { form: formData, enhance } = form;

  let amount: number[] = $state([0, 0]);
  let defaultPayee = $state();
  let defaultAccount = $state();

  $formData.amount_type = "exact";

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

    <Form.Field {form} name="repeating_date">
      <Form.Control>
        {#snippet children({ props })}
          <RepeatingDateInput
            {...props}
            bind:value={repeating_date}
          />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <!-- <fieldset class="flex flex-col gap-2">
      <legend class="text-sm font-medium">Date</legend>

      <Form.Field {form} name="date">
        <Form.Control>
          {#snippet children({ props })}=
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
            <Label
              class="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950"
            >
              <Checkbox {...props} bind:checked={$formData.repeating} class="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700" />
              <div class="grid gap-1.5 font-normal">
                <p class="text-sm font-medium leading-none">Repeat</p>
                <p class="text-muted-foreground text-sm">
                  Repeat the schedule on a regular basis.
                </p>
              </div>
            </Label>
          {/snippet}
        </Form.Control>
      </Form.Field>

      {#if $formData.repeating}
        <Tabs.Root bind:value={$formData.repeating_unit} class="w-[400px]">
          <Tabs.List>
            <Tabs.Trigger value="daily">Daily</Tabs.Trigger>
            <Tabs.Trigger value="weekly">Weekly</Tabs.Trigger>
            <Tabs.Trigger value="monthly">Monthly</Tabs.Trigger>
            <Tabs.Trigger value="yearly">Yearly</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="daily">
            <Form.Fieldset {form} name="type" class="space-y-3">
              <Card.Root>
                <Card.Header>
                  <Card.Title>Daily</Card.Title>
                </Card.Header>
                <Card.Content class="grid gap-6">
                  <RadioGroup.Root
                    bind:value={$formData.daily_type}
                    class="flex flex-col space-y-1"
                    name="type"
                  >
                    <div class="flex items-center space-x-3 space-y-0">
                      <Form.Control>
                        {#snippet children({ props })}
                          <RadioGroup.Item value="every" {...props} />
                          <Form.Label class="font-normal">Every</Form.Label>
                        {/snippet}
                      </Form.Control>
                    </div>
                    <div class="flex items-center space-x-3 space-y-0">
                      <Form.Control>
                        {#snippet children({ props })}
                          <RadioGroup.Item value="business" {...props} />
                          <Form.Label class="font-normal">Every business day</Form.Label>
                        {/snippet}
                      </Form.Control>
                    </div>
                  </RadioGroup.Root>
                </Card.Content>
              </Card.Root>
            </Form.Fieldset>
          </Tabs.Content>
          <Tabs.Content value="weekly">

          </Tabs.Content>
        </Tabs.Root> -->

        <!-- <div class="flex flex-row gap-2 items-center">
          <div class="block h-7">Repeat</div>

          <Form.Field {form} name="repeating_unit">
            <Form.Control>
              {#snippet children({ props })}
                <Select.Root
                  type="single"
                  bind:value={$formData.repeating_unit}
                  name={props.name}
                >
                  <Select.Trigger {...props}>
                    {$formData.repeating_unit ?? 'daily'}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="daily" label="daily" />
                    <Select.Item value="weekly" label="weekly" />
                    <Select.Item value="monthly" label="monthly" />
                    <Select.Item value="yearly" label="yearly" />
                  </Select.Content>
                </Select.Root>
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>

          {#if $formData.repeating_unit !== "daily"}
            <Form.Field {form} name="repeating_interval_type">
              <Form.Control>
                {#snippet children({ props })}
                  <Select.Root
                    type="single"
                    bind:value={$formData.repeating_interval_type}
                    name={props.name}
                  >
                    <Select.Trigger {...props}>
                      {$formData.repeating_interval_type ?? 'every'}
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="every" label="every" />
                      {#if $formData.repeating_unit === "monthly" || $formData.repeating_unit === "yearly"}
                        <Select.Item value="on" label="on" />
                      {/if}
                    </Select.Content>
                  </Select.Root>
                {/snippet}
              </Form.Control>
              <Form.FieldErrors />
            </Form.Field>

            <Form.Field {form} name="repeat_every">
              <Form.Control>
                {#snippet children({ props })}
                  <Select.Root
                    type="single"
                    bind:value={$formData.repeat_every}
                    name={props.name}
                  >
                    <Select.Trigger {...props}>
                      {$formData.repeat_every ?? 'monday'}
                    </Select.Trigger>
                    <Select.Content>
                      {#if $formData.repeating_unit === "weekly" && $formData.repeating_interval_type === "every"}
                        <Select.Item value="sunday" label="sunday" />
                        <Select.Item value="monday" label="monday" />
                        <Select.Item value="tuesday" label="tuesday" />
                        <Select.Item value="wednesday" label="wednesday" />
                        <Select.Item value="thursday" label="thursday" />
                        <Select.Item value="friday" label="friday" />
                        <Select.Item value="saturday" label="saturday" />
                      {:else}
                        <Select.Item value="1st" label="1st" />
                        <Select.Item value="2nd" label="2nd" />
                        <Select.Item value="3rd" label="3rd" />
                        <Select.Item value="4th" label="4th" />
                        <Select.Item value="5th" label="5th" />
                        <Select.Item value="6th" label="6th" />
                        <Select.Item value="7th" label="7th" />
                        <Select.Item value="8th" label="8th" />
                        <Select.Item value="9th" label="9th" />
                        <Select.Item value="10th" label="10th" />
                        <Select.Item value="11th" label="11th" />
                        <Select.Item value="12th" label="12th" />
                        <Select.Item value="13th" label="13th" />
                        <Select.Item value="14th" label="14th" />
                        <Select.Item value="15th" label="15th" />
                        <Select.Item value="16th" label="16th" />
                        <Select.Item value="17th" label="17th" />
                        <Select.Item value="18th" label="18th" />
                        <Select.Item value="19th" label="19th" />
                        <Select.Item value="20th" label="20th" />
                        <Select.Item value="21st" label="21st" />
                        <Select.Item value="22nd" label="22nd" />
                        <Select.Item value="23rd" label="23rd" />
                        <Select.Item value="24th" label="24th" />
                        <Select.Item value="25th" label="25th" />
                        <Select.Item value="26th" label="26th" />
                        <Select.Item value="27th" label="27th" />
                        <Select.Item value="28th" label="28th" />
                        <Select.Item value="29th" label="29th" />
                        <Select.Item value="30th" label="30th" />
                        <Select.Item value="31st" label="31st" />
                        <Select.Item value="last" label="last" />
                      {/if}
                    </Select.Content>
                  </Select.Root>
                {/snippet}
              </Form.Control>
              <Form.FieldErrors />
            </Form.Field>
          {/if}
        </div> -->
      <!-- {/if}

    </fieldset> -->
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
