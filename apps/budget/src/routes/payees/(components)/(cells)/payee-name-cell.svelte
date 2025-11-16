<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import type { Payee } from '$lib/schema';
import Building from '@lucide/svelte/icons/building';
import FolderTree from '@lucide/svelte/icons/folder-tree';
import User from '@lucide/svelte/icons/user';

interface Props {
  payee: Payee;
}

let {payee}: Props = $props();

const IconComponent = $derived(() => {
  switch (payee.payeeType) {
    case 'merchant':
    case 'utility':
    case 'financial_institution':
    case 'government':
      return Building;
    case 'individual':
    case 'employer':
    default:
      return User;
  }
});
</script>

{#snippet payeeNameContent()}
  {@const Icon = IconComponent()}
  <div class="flex items-center gap-2">
    <Icon class="text-muted-foreground h-4 w-4 shrink-0" />
    <a href="/payees/{payee.slug}" class="font-medium hover:underline">
      {payee.name || 'Unnamed Payee'}
    </a>
    {#if payee.defaultCategoryId}
      <Badge variant="outline" class="text-xs">
        <FolderTree class="mr-1 h-3 w-3" />
        Auto-Category
      </Badge>
    {/if}
  </div>
{/snippet}

{@render payeeNameContent()}
