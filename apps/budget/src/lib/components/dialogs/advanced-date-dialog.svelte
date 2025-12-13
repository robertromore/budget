<script lang="ts">
import AdvancedDateInput from '$lib/components/input/advanced-date-input.svelte';
import * as Dialog from '$lib/components/ui/dialog';
import type { FacetedFilterOption } from '$lib/types';

let { dialogOpen = $bindable(), onSubmit } = $props();

const _onSubmit = (new_value: FacetedFilterOption) => {
  onSubmit(new_value);
};
</script>

<Dialog.Root bind:open={() => dialogOpen, (newOpen) => (dialogOpen = newOpen)}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Custom Date</Dialog.Title>
      <Dialog.Description>
        <AdvancedDateInput onSubmit={_onSubmit} />
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
