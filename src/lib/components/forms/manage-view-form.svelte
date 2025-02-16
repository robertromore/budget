<script lang="ts">
  import * as Form from '$lib/components/ui/form';
  import {
    insertViewSchema,
    type Transaction
  } from '$lib/schema';
  import { superForm } from 'sveltekit-superforms/client';
  import Textarea from '$lib/components/ui/textarea/textarea.svelte';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { page } from '$app/state';
  import { Input } from '../ui/input';
  import FilterInput from '../input/filter-input.svelte';
  import type { FilterInputOption, TransactionsFormat, ViewFilter } from '$lib/types';
  import DisplayInput from '../input/display-input.svelte';
  import { Button, buttonVariants } from '../ui/button';
  import { currentViews } from '$lib/states/current-views.svelte';
    import SuperDebug from 'sveltekit-superforms';

  let {
    onCancel,
    onSave,
    availableFilters,
    // filters,
  }: {
    onCancel?: () => {},
    onSave?: (new_entity: Transaction) => void;
    availableFilters: FilterInputOption<TransactionsFormat>[];
    // filters?: ViewFilter[];
  } = $props();

  const { data: { manageViewForm } } = page;

  const form = superForm(manageViewForm, {
    id: 'views-form',
    dataType: 'json',
    validators: zodClient(insertViewSchema),
    onResult: async ({ result }) => {
      if (onSave) {
        if (result.type === 'success' && result.data) {
          onSave(result.data.entity);
        }
      }
    }
  });

  const { form: formData, enhance, errors } = form;

  const _currentViews = currentViews.get();
  const activeView = _currentViews.activeView;

  // const filters = $derived(activeView.filters);
  $effect(() => {
    $formData.filters = Array.from(activeView.view.getAllFilterValues());
    $formData.display = {
      grouping: activeView.view.getGrouping(),
      sorting: activeView.view.getSorting(),
      expanded: activeView.view.getExpanded()
    };
  });
</script>

<form method="post" action="/views?/add-view" use:enhance class="border p-4 rounded-sm">
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
          <!-- <input hidden bind:value={$formData.name} name={props.name} /> -->
        {/snippet}
      </Form.Control>
    </Form.Field>
    <div class="min-w-max">
      <Button variant="destructive" size="default" onclick={() => {
        if (onCancel) {
          onCancel();
        }
        _currentViews.removeTemporaryView();
      }}>cancel</Button>
      <Form.Button class={buttonVariants({ size: "default" })}>save</Form.Button>
    </div>
  </div>

  <Form.Field {form} name="description">
    <Form.Control>
      {#snippet children({ props })}
        <Textarea {...props} bind:value={$formData.description} name={props.name} placeholder="Description (optional)" />
        <Form.FieldErrors />
        <!-- <input hidden bind:value={$formData.description} name={props.name} /> -->
      {/snippet}
    </Form.Control>
  </Form.Field>
  <div class="flex justify-between">
    <Form.Field {form} name="filters">
      <Form.Control>
        {#snippet children({ props })}
          <FilterInput {...props} {availableFilters} />
          <Form.FieldErrors />
          <input hidden bind:value={$formData.filters} name={props.name} />
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

<!-- <SuperDebug data={$formData}/>
<SuperDebug data={$errors}/> -->
