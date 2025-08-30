<script lang="ts">
  import { page } from "$app/state";
  import * as Form from "$lib/components/ui/form";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { insertViewSchema, type View } from "$lib/schema";
  import type { CurrentViewState } from "$lib/states/current-view.svelte";
  import { currentViews } from "$lib/states/current-views.svelte";
  import type { FilterInputOption, TransactionsFormat } from "$lib/types";
  import { zod4Client } from "sveltekit-superforms/adapters";
  import { superForm } from "sveltekit-superforms/client";
  import DeleteViewDialog from "$lib/components/dialogs/delete-view-dialog.svelte";
  import DisplayInput from "$lib/components/input/display-input.svelte";
  import FilterInput from "$lib/components/input/filter-input.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";

  let {
    onCancel,
    onDelete,
    onSave,
    availableFilters,
    viewId = $bindable(),
  }: {
    onCancel?: () => void;
    onDelete?: () => void;
    onSave?: (new_entity: View) => void;
    availableFilters: FilterInputOption<TransactionsFormat>[];
    viewId?: number;
  } = $props();

  const {
    data: { manageViewForm },
  } = page;

  const form = superForm(manageViewForm, {
    id: "views-form",
    dataType: "json",
    validators: zod4Client(insertViewSchema),
    onResult: async ({ result }) => {
      if (onSave) {
        if (result.type === "success" && result.data) {
          onSave(result.data.entity);
        }
      }
    },
  });

  const { form: formData, enhance, errors } = form;

  const _currentViews = $derived(currentViews.get());
  const activeView = $derived(
    viewId && viewId > 0 ? _currentViews.get(viewId) : _currentViews.activeView
  ) as CurrentViewState<TransactionsFormat>;

  let alertDialogOpen = $state(false);

  $effect(() => {
    $formData.id = viewId;
    $formData.name = activeView?.view.name;
    $formData.description = activeView?.view.description;
    $formData.filters = activeView?.view.getAllFilterValues();
    $formData.display = {
      grouping: activeView?.view.getGrouping(),
      sorting: activeView?.view.getSorting(),
      expanded: activeView?.view.getExpanded(),
    };
  });
</script>

<DeleteViewDialog
  bind:dialogOpen={alertDialogOpen}
  views={[$formData.id]}
  onDelete={() => {
    if (onDelete) {
      onDelete();
    }
    activeView?.view.deleteView();
  }}
/>

<form method="post" action="/views?/save-view" use:enhance class="rounded-sm border p-4">
  <!-- <Form.Field {form} name="icon">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Icon</Form.Label>
        <Input {...props} bind:value={icon} />
        <Form.FieldErrors />
        <input hidden bind:value={$formData.icon} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field> -->

  <div class="flex">
    <Form.Field {form} name="name" class="mr-2 w-full">
      <Form.Control>
        {#snippet children({ props })}
          <Input {...props} bind:value={$formData.name} name={props.name} placeholder="View name" />
          <Form.FieldErrors />
        {/snippet}
      </Form.Control>
    </Form.Field>
    <div class="min-w-max">
      <Form.Button class={buttonVariants({ size: "default" })}>save</Form.Button>
      <Button
        variant="outline"
        size="default"
        onclick={() => {
          if (onCancel) {
            onCancel();
          }
          _currentViews.removeTemporaryView();
        }}>cancel</Button
      >
      {#if viewId !== 0}
        <Button variant="destructive" size="default" onclick={() => {
          if (onDelete) {
            onDelete();
          }
          alertDialogOpen = true;
        }}
          >delete</Button
        >
      {/if}
    </div>
  </div>

  <Form.Field {form} name="description">
    <Form.Control>
      {#snippet children({ props })}
        <Textarea
          {...props}
          bind:value={$formData.description}
          name={props.name}
          placeholder="Description (optional)"
        />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>
  <div class="flex justify-between">
    <Form.Field {form} name="filters">
      <Form.Control>
        {#snippet children({ props })}
          <FilterInput {...props} {availableFilters} bind:value={$formData.filters} />
          <Form.FieldErrors />
        {/snippet}
      </Form.Control>
    </Form.Field>
    <Form.Field {form} name="display">
      <Form.Control>
        {#snippet children({ props })}
          <DisplayInput />
          <Form.FieldErrors />
          <input hidden bind:value={$formData.display} name={props.name} />
        {/snippet}
      </Form.Control>
    </Form.Field>
  </div>
</form>
