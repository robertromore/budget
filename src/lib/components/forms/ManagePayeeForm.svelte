<script lang="ts" generics="T extends Schema, S extends Zod.ZodTypeAny">
  import { insertPayeeSchema, type Payee } from "$lib/schema";
  import { getPayeeState } from "$lib/states/PayeeState.svelte";
  import { page } from "$app/stores";
  import * as Form from "$lib/components/ui/form";
  import { trpc } from "$lib/trpc/client";
  import { superForm, type Infer, type SuperValidated, type Schema } from "sveltekit-superforms/client";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { zodClient } from "sveltekit-superforms/adapters";
  import Input from "../ui/input/input.svelte";
  import { Textarea } from "../ui/textarea";

  let { payeeId, name, notes, onDelete, onSave }: {
    payeeId?: number | undefined;
    name?: string;
    notes?: string;
    onDelete?: (id: number) => void;
    onSave?: (new_payee) => void;
  } = $props();

  const data = getPayeeState();

  const form = superForm(
    data.managePayeeForm,
    {
      validators: zodClient(insertPayeeSchema),
      onResult: async({ result }) => {
        if (onSave)
          onSave(result.data.entity);
      },
    }
  );

  const { form: formData, enhance } = form;
  if (payeeId) {
    const payee: Payee = data.payees.filter((payeeEntity: Payee) => payeeEntity.id === payeeId)[0];
    $formData.name = payee.name;
    $formData.notes = payee.notes;
  }

  let alertDialogOpen = $state(false);
  const deletePayee = async(id: number) => {
    alertDialogOpen = false;
    if (payeeId) {
      await trpc($page).payeeRoutes.remove.mutate({ id: payeeId });
      if (onDelete) {
        onDelete(id);
      }
    }
  }
</script>

<form method="post" action="/payees?/save-payee" use:enhance class="grid grid-cols-2 gap-2">
  <input type="hidden" name="id" value={payeeId}/>
  <Form.Field {form} name="name">
    <Form.Control let:attrs>
      <Form.Label>Name</Form.Label>
      <Input {...attrs} bind:value={$formData.name} class="w-full" />
      <Form.FieldErrors />
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
  {#if payeeId}
    <Button variant="destructive" onclick={() => alertDialogOpen = true}>delete</Button>
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
      <AlertDialog.Action onclick={() => deletePayee(payeeId!)} class={buttonVariants({ variant: "destructive" })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
