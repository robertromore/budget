<script lang="ts">
  import type { EditableEntityItem } from "$lib/types";
  import { type Payee } from "$lib/schema";
  import { superformInsertPayeeSchema } from "$lib/schema/superforms";
  import { page } from "$app/state";
  import * as Form from "$lib/components/ui/form";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { superForm } from "sveltekit-superforms";
  import { zod4Client } from "sveltekit-superforms/adapters";
  import { PayeesState } from "$lib/states/entities/payees.svelte";

  let {
    id,
    onDelete,
    onSave,
  }: {
    id?: number | undefined;
    onDelete?: (id: number) => void;
    onSave?: (new_payee: EditableEntityItem, is_new: boolean) => void;
  } = $props();

  const {
    data: { managePayeeForm },
  } = page;
  const form = superForm(managePayeeForm || { name: "", notes: "" }, {
    id: "payee-form",
    validators: zod4Client(superformInsertPayeeSchema),
    onResult: async ({ result }) => {
      if (onSave) {
        if (result.type === "success" && result.data) {
          onSave(result.data['entity'], (id ?? 0) === 0);
        }
      }
    },
  });

  const { form: formData, enhance } = form;
  if (id) {
    const payee: Payee = PayeesState.get().getById(id)!;
    $formData.name = payee.name;
    $formData.notes = payee.notes;
  }

  let alertDialogOpen = $state(false);
  const deletePayee = async (id: number) => {
    alertDialogOpen = false;
    // data.deletePayee(id);
    if (onDelete) {
      onDelete(id);
    }
  };
</script>

<form method="post" action="/payees?/save-payee" use:enhance>
  {#if id}
    <input type="hidden" name="id" value={id} />
  {/if}
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
  {#if id}
    <Button variant="destructive" onclick={() => (alertDialogOpen = true)}>delete</Button>
  {/if}
</form>

<AlertDialog.Root bind:open={alertDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this payee.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={() => deletePayee(id!)}
        class={buttonVariants({ variant: "destructive" })}>Continue</AlertDialog.Action
      >
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
