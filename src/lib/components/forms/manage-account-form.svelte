<script lang="ts">
  import * as Form from "$lib/components/ui/form";
  import { accountFormSchema } from "$lib/schema/forms";
  import { type Account } from "$lib/schema";
  import { superForm } from "sveltekit-superforms/client";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { zod4Client } from "sveltekit-superforms/adapters";
  import { page } from "$app/state";
  import Input from "$lib/components/ui/input/input.svelte";
  import { AccountsState } from "$lib/stores/entities/accounts.svelte";

  let {
    accountId,
    onSave,
  }: {
    accountId?: number;
    onDelete?: (id: number) => void;
    onSave?: (new_entity: Account) => void;
  } = $props();

  const {
    data: { manageAccountForm },
  } = page;

  const accounts = AccountsState.get();

  const form = superForm(manageAccountForm, {
    id: "account-form",
    onResult: async ({ result }) => {
      if (onSave) {
        if (result.type === "success" && result.data) {
          accounts.addAccount(result.data.entity);
          onSave(result.data.entity);
        }
      }
    },
  });

  const { form: formData, enhance } = form;

  if (accountId && accountId > 0) {
    $formData.id = accountId;
    $formData.name = accounts.getById(accountId).name;
    $formData.notes = accounts.getById(accountId).notes;
  }
</script>

<form method="post" action="/accounts?/add-account" use:enhance class="grid grid-cols-2 gap-2">
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
