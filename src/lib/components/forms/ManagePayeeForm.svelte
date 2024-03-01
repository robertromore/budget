<script lang="ts">
  import { page } from "$app/stores";
  import * as Form from "$lib/components/ui/form";
  import { formInsertPayeeSchema, type Payee } from "$lib/schema";
  import { trpc } from "$lib/trpc/client";
  import { superForm } from "sveltekit-superforms/client";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import type { EditableEntityItem } from "../types";

  let { payeeId, name, notes, onDelete, onSave } = $props<{
    payeeId?: number | undefined,
    name?: string,
    notes?: string,
    onDelete?: (id: number) => void,
    onSave?: (entity: EditableEntityItem, is_new: boolean) => void
  }>();

  // const form = superForm(
  //   superValidateSync(formInsertPayeeSchema),
  //   {
  //     SPA: true,
  //     validators: formInsertPayeeSchema,
  //     onSubmit: async(input) => {
  //       const data: {
  //         name: string,
  //         notes: string | undefined,
  //         id?: number | undefined
  //       } = {
  //         name: input.formData.get('name')?.toString() || '',
  //         notes: input.formData.get('notes')?.toString(),
  //       };
  //       if (payeeId) {
  //         data.id = payeeId;
  //       }
  //       if (!data.name) {
  //         return false;
  //       }
  //       await trpc($page).payeeRoutes.save.mutate(data).then((entity: EditableEntityItem[]) => {
  //         if (onSave) onSave(entity[0], !('id' in data));
  //       });
  //     },
  //   }
  // );

  // const loadEntity = async(id: number) => {
  //   return await trpc($page).payeeRoutes.load.query({ id }).then((entity: Payee) => {
  //     form.fields.name.value.set(entity.name || '');
  //     form.fields.notes.value.set(entity.notes || '');
  //   });
  // }

  // let alertDialogOpen = $state(false);
  // const deleteEntity = async(id: number) => {
  //   alertDialogOpen = false;
  //   if (payeeId) {
  //     await trpc($page).payeeRoutes.remove.mutate({ id: payeeId });
  //     if (onDelete) {
  //       onDelete(id);
  //     }
  //   }
  // }

  // if (payeeId) {
  //   loadEntity(payeeId);
  // }
  // if (name) {
  //   form.fields.name.value.set(name);
  // }
  // if (notes) {
  //   form.fields.notes.value.set(notes);
  // }
</script>

<!-- // <Form.Root controlled {form} schema={formInsertPayeeSchema} let:config let:submitting>
//   <Form.Field {config} name="name">
//     <Form.Item>
//       <Form.Label>Payee name</Form.Label>
//       <Form.Input />
//       <Form.Validation />
//     </Form.Item>
//   </Form.Field>
//   <Form.Field {config} name="notes">
//     <Form.Item>
//       <Form.Label>Notes</Form.Label>
//       <Form.Textarea />
//       <Form.Validation />
//     </Form.Item>
//   </Form.Field>
//   <Form.Button disabled={submitting}>Save</Form.Button>
//   {#if payeeId}
//     <Button variant="destructive" onclick={() => alertDialogOpen = true}>Delete</Button>
//   {/if}
// </Form.Root>

// <AlertDialog.Root bind:open={alertDialogOpen}>
//   <AlertDialog.Content>
//     <AlertDialog.Header>
//       <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
//       <AlertDialog.Description>
//         This action cannot be undone. This will permanently delete this payee.
//       </AlertDialog.Description>
//     </AlertDialog.Header>
//     <AlertDialog.Footer>
//       <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
//       <AlertDialog.Action onclick={() => deleteEntity(payeeId!)} class={buttonVariants({ variant: "destructive" })}>Continue</AlertDialog.Action>
//     </AlertDialog.Footer>
//   </AlertDialog.Content>
// </AlertDialog.Root> -->
