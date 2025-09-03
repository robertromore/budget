<script lang="ts">
  // Framework imports
  import type { Component } from "svelte";

  // SvelteKit imports  
  import { page } from "$app/state";

  // Third-party library imports
  import { superForm } from "sveltekit-superforms/client";
  import { zod4Client } from "sveltekit-superforms/adapters";

  // UI component imports
  import * as Form from "$lib/components/ui/form";
  import { Button } from "$lib/components/ui/button";
  import Input from "$lib/components/ui/input/input.svelte";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";

  // Internal component imports
  import { DateInput, EntityInput, NumericInput } from "$lib/components/input";

  // Schema imports
  import type { EntitySchema } from "$lib/schema";
  import { superformEntitySchema } from "$lib/schema/superforms";

  // Type imports
  import type { EditableEntityItem, EditableDateItem } from "$lib/types";

  // --- Form Props Interface ---
  interface Props {
    // Entity management
    entityId?: number;
    initialData?: Partial<EntitySchema>;
    
    // Event handlers
    onSave?: (entity: EntitySchema) => void;
    onCancel?: () => void;
    onDelete?: (id: number) => void;
    
    // Form configuration
    submitLabel?: string;
    cancelLabel?: string;
    showDelete?: boolean;
    
    // Styling
    class?: string;
  }

  // --- Props Destructuring ---
  let {
    entityId,
    initialData,
    onSave,
    onCancel, 
    onDelete,
    submitLabel = "Save",
    cancelLabel = "Cancel",
    showDelete = false,
    class: className
  }: Props = $props();

  // --- Page Data Access ---
  const {
    data: { entityForm, relatedEntities }
  } = page;

  // --- Superform Setup ---
  const form = superForm(entityForm, {
    id: "entity-form",
    dataType: "json",
    validators: zod4Client(superformEntitySchema),
    onResult: async ({ result }) => {
      if (result.type === "success" && result.data && onSave) {
        onSave(result.data.entity);
      }
    }
  });

  const { form: formData, enhance, errors } = form;

  // --- Form State ---
  let dateValue: EditableDateItem = $state(initialData?.date || today(getLocalTimeZone()));
  let entityValue: EditableEntityItem = $state(
    initialData?.entity || { id: 0, name: "" }
  );
  let numericValue: number = $state(initialData?.amount || 0);

  // --- Effects: Sync form data ---
  $effect(() => {
    if (initialData) {
      $formData.id = entityId;
      Object.assign($formData, initialData);
    }
  });

  $effect(() => {
    $formData.date = dateValue.toString();
    $formData.entityId = entityValue.id;
    $formData.amount = numericValue;
  });

  // --- Event Handlers ---
  function handleCancel() {
    if (onCancel) {
      onCancel();
    }
  }

  function handleDelete() {
    if (onDelete && entityId) {
      onDelete(entityId);
    }
  }
</script>

<form 
  method="post" 
  action="/entities?/save-entity" 
  use:enhance 
  class="space-y-4 {className || ''}"
>
  <!-- Hidden ID field for updates -->
  <input type="hidden" bind:value={$formData.id} name="id" />

  <!-- Text Input Example -->
  <Form.Field {form} name="name">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Name</Form.Label>
        <Input {...props} bind:value={$formData.name} placeholder="Enter name" />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <!-- Date Input Example -->
  <Form.Field {form} name="date">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Date</Form.Label>
        <DateInput {...props} bind:value={dateValue} />
        <Form.FieldErrors />
        <input type="hidden" bind:value={$formData.date} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <!-- Numeric Input Example -->
  <Form.Field {form} name="amount">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Amount</Form.Label>
        <NumericInput {...props} bind:value={numericValue} />
        <Form.FieldErrors />
        <input type="hidden" bind:value={$formData.amount} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <!-- Entity Input Example -->
  <Form.Field {form} name="entityId">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Related Entity</Form.Label>
        <EntityInput
          {...props}
          entityLabel="entities"
          entities={relatedEntities}
          bind:value={entityValue}
        />
        <Form.FieldErrors />
        <input type="hidden" bind:value={$formData.entityId} name={props.name} />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <!-- Textarea Example -->
  <Form.Field {form} name="description">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Description</Form.Label>
        <Textarea {...props} bind:value={$formData.description} placeholder="Optional description" />
        <Form.FieldErrors />
      {/snippet}
    </Form.Control>
  </Form.Field>

  <!-- Form Actions -->
  <div class="flex justify-between">
    <div>
      {#if showDelete && entityId}
        <Button type="button" variant="destructive" onclick={handleDelete}>
          Delete
        </Button>
      {/if}
    </div>
    
    <div class="flex gap-2">
      <Button type="button" variant="outline" onclick={handleCancel}>
        {cancelLabel}
      </Button>
      <Form.Button>
        {submitLabel}
      </Form.Button>
    </div>
  </div>
</form>