<script lang="ts">
  import * as Form from "$lib/components/ui/form";
  import { formInsertTransactionSchema, type Transaction } from "$lib/schema";
  import { superForm } from "sveltekit-superforms/client";
  import { today, getLocalTimeZone } from "@internationalized/date";
  import type { EditableDateItem, EditableEntityItem, EditableNumericItem } from "../types";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { zodClient } from "sveltekit-superforms/adapters";
  import DateInput from "$lib/components/input/DateInput.svelte";
  import EntityInput from "$lib/components/input/EntityInput.svelte";
  import NumericInput from "$lib/components/input/NumericInput.svelte";
  import SuperDebug from "sveltekit-superforms";

  let { accountId, onDelete, onSave, dataForm } = $props<{
    accountId: number,
    onDelete?: (id: number) => void,
    onSave?: (new_entity: Transaction) => void,
    dataForm
  }>();

  const form = superForm(
    dataForm,
    {
      validators: zodClient(formInsertTransactionSchema),
      onResult: async({ result }) => {
        if (onSave)
          onSave(result.data.entity);
      },
    }
  );

  const { form: formData, enhance } = form;

  $formData.accountId = accountId;

  let dateValue: EditableDateItem = $state(today(getLocalTimeZone()));
  let numericAmount: EditableNumericItem = $state({
    value: 0,
    formatted: '0'
  });
  let payee: EditableEntityItem = $state({
    id: 0,
    name: '',
  });
  let category: EditableEntityItem = $state({
    id: 0,
    name: '',
  });
  $effect(() => {
    $formData.date = dateValue.toString();
    $formData.amount = numericAmount.value;
    $formData.payeeId = payee.id;
    $formData.categoryId = category.id;
  })
</script>

<form method="post" action="/accounts?/add-transaction" use:enhance class="grid grid-cols-2 gap-2">
  <input hidden value={$formData.accountId} name="accountId" />
  <Form.Field {form} name="date">
    <Form.Control let:attrs>
      <Form.Label>Date</Form.Label>
      <DateInput {...attrs} bind:value={dateValue}/>
      <Form.FieldErrors />
      <input hidden value={$formData.date} name={attrs.name} />
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="amount">
    <Form.Control let:attrs>
      <Form.Label>Amount</Form.Label>
      <NumericInput {...attrs} bind:amount={numericAmount} />
      <Form.FieldErrors />
      <input hidden value={$formData.amount} name={attrs.name} />
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="payeeId">
    <Form.Control let:attrs>
      <Form.Label>Payee</Form.Label>
      <EntityInput {...attrs} entityLabel="payees" bind:value={payee} />
      <Form.FieldErrors />
      <input hidden value={$formData.payeeId} name={attrs.name} />
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="categoryId">
    <Form.Control let:attrs>
      <Form.Label>Category</Form.Label>
      <EntityInput {...attrs} entityLabel="categories" bind:value={category} />
      <Form.FieldErrors />
      <input hidden value={$formData.categoryId} name={attrs.name} />
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="notes" class="col-span-full">
    <Form.Control let:attrs>
      <Form.Label>Notes</Form.Label>
      <Textarea {...attrs} bind:value={$formData.notes} />
      <Form.FieldErrors />
    </Form.Control>
  </Form.Field>
  <Form.Button>save</Form.Button>
</form>
