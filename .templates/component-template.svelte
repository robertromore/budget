<script lang="ts">
  // Framework imports
  import type { Component } from "svelte";

  // SvelteKit imports
  import { page } from "$app/state";

  // Third-party library imports
  // import IconComponent from "@lucide/svelte/icons/icon-name";

  // UI component imports
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";

  // Internal component imports
  import { SomeInput } from "$lib/components/input";

  // State imports
  import { someState } from "$lib/states/entities";

  // Type imports
  import type { SomeType } from "$lib/types";
  import type { SomeSchema } from "$lib/schema";

  // Utility imports
  import { cn } from "$lib/utils";

  // --- Component Props Interface ---
  interface Props {
    // Required props
    requiredProp: string;
    
    // Optional props with default values
    optionalProp?: boolean;
    
    // Bindable props
    bindableProp?: string;
    
    // Event handler props
    onSave?: (entity: SomeSchema) => void;
    onCancel?: () => void;
    
    // Style props
    class?: string;
    
    // Complex object props
    complexProp?: {
      enabled: boolean;
      handler: (value: unknown) => void;
    };
    
    // Component props
    icon?: Component;
  }

  // --- Props Destructuring ---
  let {
    requiredProp,
    optionalProp = false,
    bindableProp = $bindable(),
    onSave,
    onCancel,
    class: className,
    complexProp,
    icon: Icon
  }: Props = $props();

  // --- Local State ---
  let localState = $state("initial value");
  let isOpen = $state(false);

  // --- Derived State ---
  const derivedValue = $derived(localState.toUpperCase());
  const computedClass = $derived(cn("base-class", className));

  // --- Effects ---
  $effect(() => {
    // Side effects when dependencies change
    console.log("Required prop changed:", requiredProp);
  });

  // --- Event Handlers ---
  function handleSave() {
    if (onSave) {
      onSave(/* some entity */);
    }
    isOpen = false;
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    }
    isOpen = false;
  }
</script>

<!-- Template markup following consistent patterns -->
<div class={computedClass}>
  <Button onclick={() => isOpen = true}>
    {#if Icon}
      <Icon class="mr-2 size-4" />
    {/if}
    Open Component
  </Button>

  <Dialog.Root bind:open={isOpen}>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Component Title</Dialog.Title>
        <Dialog.Description>
          Description of what this component does.
        </Dialog.Description>
      </Dialog.Header>
      
      <!-- Component content -->
      <div class="space-y-4">
        <SomeInput bind:value={bindableProp} />
        
        {#if optionalProp}
          <div>Optional content</div>
        {/if}
      </div>
      
      <Dialog.Footer>
        <Button variant="outline" onclick={handleCancel}>
          Cancel
        </Button>
        <Button onclick={handleSave}>
          Save
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>
</div>