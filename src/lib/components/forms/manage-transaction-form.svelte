<script lang="ts">
  import * as Form from "$lib/components/ui/form";
  import { type Transaction } from "$lib/schema";
  import { superformInsertTransactionSchema } from "$lib/schema/superforms";
  import { superForm } from "sveltekit-superforms/client";
  import { today, getLocalTimeZone } from "@internationalized/date";
  import type { EditableDateItem, EditableEntityItem } from "$lib/types";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { zod4Client } from "sveltekit-superforms/adapters";
  import DateInput from "$lib/components/input/date-input.svelte";
  import EntityInput from "$lib/components/input/entity-input.svelte";
  import NumericInput from "$lib/components/input/numeric-input.svelte";
  import { page } from "$app/state";
  import HandCoins from "@lucide/svelte/icons/hand-coins";
  import type { Component } from "svelte";
  import SquareMousePointer from "@lucide/svelte/icons/square-mouse-pointer";

  let {
    accountId,
    onSave,
  }: {
    accountId: number;
    onDelete?: (id: number) => void;
    onSave?: (new_entity: Transaction) => void;
  } = $props();

  const {
    data: { payees, categories, manageTransactionForm },
  } = page;

  const form = superForm(manageTransactionForm, {
    id: "transaction-form",
    validators: zod4Client(superformInsertTransactionSchema),
    onResult: async ({ result }) => {
      if (onSave) {
        if (result.type === "success" && result.data) {
          onSave(result.data['entity']);
        }
      }
    },
  });

  const { form: formData, enhance } = form;

  $formData.accountId = accountId;

  let dateValue: EditableDateItem = $state(today(getLocalTimeZone()));
  let amount: number = $state<number>(0);
  let payee: EditableEntityItem = $state({
    id: 0,
    name: "",
  });
  let category: EditableEntityItem = $state({
    id: 0,
    name: "",
  });

  $effect(() => {
    $formData.date = dateValue.toString();
    $formData.amount = amount;
    $formData.payeeId = payee.id;
    $formData.categoryId = category.id;
  });
</script>

<form method="post" action="/accounts?/add-transaction" use:enhance class="grid grid-cols-2 gap-2">
  <input hidden value={$formData.accountId} name="accountId" />
  <Form.Field {form} name="date">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Date</Form.Label>
        <DateInput {...props} bind:value={dateValue} />
        <Form.FieldErrors />
        <input hidden bind:value={$formData.date} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="amount">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Amount</Form.Label>
        <NumericInput {...props} bind:value={amount} buttonClass="w-full" />
        <Form.FieldErrors />
        <input hidden bind:value={$formData.amount} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="payeeId">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Payee</Form.Label>
        <EntityInput
          {...props}
          entityLabel="payees"
          entities={payees as EditableEntityItem[]}
          bind:value={payee}
          icon={HandCoins as unknown as Component}
          buttonClass="w-full"
        />
        <Form.FieldErrors />
        <input hidden bind:value={$formData.payeeId} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="categoryId">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Category</Form.Label>
        <EntityInput
          {...props}
          entityLabel="categories"
          entities={categories as EditableEntityItem[]}
          bind:value={category}
          icon={SquareMousePointer as unknown as Component}
          buttonClass="w-full"
        />
        <Form.FieldErrors />
        <input hidden bind:value={$formData.categoryId} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Field {form} name="notes" class="col-span-full">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Notes</Form.Label>
        <Textarea {...props} bind:value={$formData.notes} />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <Form.Button>save</Form.Button>
</form>
