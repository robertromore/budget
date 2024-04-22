<script lang="ts">
  import type { EditableEntityItem } from "../types";
  import { insertCategorySchema, type Category } from "$lib/schema";
  import { getCategoryState } from "$lib/states/CategoryState.svelte";
  import { page } from "$app/stores";
  import * as Form from "$lib/components/ui/form";
  import { trpc } from "$lib/trpc/client";
  import { superForm } from "sveltekit-superforms/client";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { zodClient } from "sveltekit-superforms/adapters";
  import Input from "../ui/input/input.svelte";
  import { Textarea } from "../ui/textarea";

  let { categoryId, onDelete, onSave }: {
    categoryId?: number | undefined;
    onDelete?: (id: number) => void;
    onSave?: (new_value: EditableEntityItem, is_new: boolean) => void;
  } = $props();

  const data = getCategoryState();

  const form = data.manageCategorySuperForm(onSave);

  const { form: formData, enhance } = form;
  if (categoryId) {
    const category: Category = data.categories.filter((categoryEntity: Category) => categoryEntity.id === categoryId)[0];
    $formData.name = category.name;
    $formData.notes = category.notes;
  }

  let alertDialogOpen = $state(false);
  const deleteCategory = async(id: number) => {
    alertDialogOpen = false;
    data.deleteCategory(id);
    if (onDelete) {
      onDelete(id);
    }
  }
</script>

<form method="post" action="/categories?/save-category" use:enhance class="grid grid-cols-2 gap-2">
  {#if categoryId}
    <input type="hidden" name="id" value={categoryId}/>
  {/if}
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
  {#if categoryId}
    <Button variant="destructive" onclick={() => alertDialogOpen = true}>delete</Button>
  {/if}
</form>

<AlertDialog.Root bind:open={alertDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
      <AlertDialog.Description>
        This action cannot be undone. This will permanently delete this category.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={() => deleteCategory(categoryId!)} class={buttonVariants({ variant: "destructive" })}>Continue</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
