<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import Plus from '@lucide/svelte/icons/plus';

let {
  searchQuery = $bindable(''),
  placeholder = 'Search payees...',
  allowCreate = true,
  onCreateNew,
}: {
  searchQuery?: string;
  placeholder?: string;
  allowCreate?: boolean;
  onCreateNew?: () => void;
} = $props();
</script>

<div class="relative">
  <Command.Input bind:value={searchQuery} {placeholder} class={allowCreate ? 'pr-12' : ''} />

  {#if allowCreate && onCreateNew}
    <Button
      size="icon"
      class="absolute top-0 right-0 rounded-none rounded-tr-md"
      onclick={onCreateNew}
      title="Create new payee">
      <Plus class="h-4 w-4" />
    </Button>
  {/if}
</div>
