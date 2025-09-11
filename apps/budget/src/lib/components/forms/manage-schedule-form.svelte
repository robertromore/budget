<script lang="ts">
// Framework imports
import type {Component} from 'svelte';

// SvelteKit imports
import {page} from '$app/state';

// Third-party library imports
import HandCoins from '@lucide/svelte/icons/hand-coins';
import {superForm} from 'sveltekit-superforms';
import {zod4Client} from 'sveltekit-superforms/adapters';

// UI component imports
import * as Form from '$lib/components/ui/form';
import {Input} from '$ui/lib/components/ui/input';
import {EntityInput, MultiNumericInput} from '$lib/components/input';

// Model imports
import RepeatingDateInputModel from '$lib/models/repeating_date.svelte';

// Schema imports
import {type Schedule} from '$lib/schema/schedules';
import {superformInsertScheduleSchema} from '$lib/schema/superforms';

// State imports
import {SchedulesState} from '$lib/states/entities';

// Type imports
import type {EditableEntityItem} from '$lib/types';

// Local component imports
import {RepeatingDateInput} from '$lib/components/input';

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
  data: {accounts, payees, manageScheduleForm},
} = page;

// State
const schedules = SchedulesState.get();

let payee: EditableEntityItem = $state({id: 0, name: ''});
let account: EditableEntityItem = $state({id: 0, name: ''});
let repeating_date = $state(new RepeatingDateInputModel());

// Form
const form = superForm(manageScheduleForm, {
  id: 'schedule-form',
  validators: zod4Client(superformInsertScheduleSchema),
  onResult: async ({result}) => {
    if (onSave && result.type === 'success' && result.data) {
      schedules.addSchedule(result.data['entity']);
      onSave(result.data['entity']);
    }
  },
});

const {form: formData, enhance} = form;

let amount: number[] = $state([0, 0]);
let defaultPayee = $state();
let defaultAccount = $state();

$formData.amount_type = 'exact';

// Initialize form data if editing
if (scheduleId && scheduleId > 0) {
  $formData.id = scheduleId;
  const schedule = schedules.getById(scheduleId);
  $formData.name = schedule?.name;
  $formData.payeeId = defaultPayee = schedule?.payeeId;
  $formData.accountId = defaultAccount = schedule?.accountId;
  $formData.amount_type = schedule?.amount_type;
  (() => {
    amount[0] = schedule?.amount || 0;
    amount[1] = schedule?.amount_2 || 0;
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
      {#snippet children({props})}
        <Form.Label>Name</Form.Label>
        <Input {...props} bind:value={$formData.name} />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <div class="">
    <Form.Field {form} name="payeeId">
      <Form.Control>
        {#snippet children({props})}
          <Form.Label>Payee</Form.Label>
          <EntityInput
            entityLabel="payees"
            entities={payees as EditableEntityItem[]}
            defaultValue={defaultPayee}
            bind:value={payee}
            icon={HandCoins as unknown as Component}
            buttonClass="w-full" />
          <Form.FieldErrors />
          <input hidden bind:value={$formData.payeeId} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Field {form} name="accountId">
      <Form.Control>
        {#snippet children({props})}
          <Form.Label>Account</Form.Label>
          <EntityInput
            entityLabel="account"
            entities={accounts as EditableEntityItem[]}
            defaultValue={defaultAccount}
            bind:value={account}
            icon={HandCoins as unknown as Component}
            buttonClass="w-full" />
          <Form.FieldErrors />
          <input hidden bind:value={$formData.accountId} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Field {form} name="amount">
      <Form.Control>
        {#snippet children({props})}
          <Form.Label>Amount</Form.Label>
          <MultiNumericInput {...props} bind:value={amount} bind:type={$formData.amount_type} />
          <Form.FieldErrors />
          <input hidden bind:value={$formData.amount} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Field {form} name="amount_2">
      <Form.Control>
        {#snippet children({props})}
          <input hidden bind:value={$formData.amount_2} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Field {form} name="amount_type">
      <Form.Control>
        {#snippet children({props})}
          <input hidden bind:value={$formData.amount_type} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>

    <Form.Field {form} name="repeating_date">
      <Form.Control>
        {#snippet children({props})}
          <RepeatingDateInput {...props} bind:value={repeating_date} />
        {/snippet}
      </Form.Control>
    </Form.Field>
  </div>

  <Form.Button>save</Form.Button>
</form>
