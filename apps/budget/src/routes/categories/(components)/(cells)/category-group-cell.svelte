<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import FolderOpen from '@lucide/svelte/icons/folder-open';

interface Props {
  groupName: string | null;
  groupColor: string | null;
  groupIcon: string | null;
}

let { groupName, groupColor, groupIcon }: Props = $props();

const iconData = $derived(() => {
  if (!groupIcon) return null;
  return getIconByName(groupIcon);
});

const GroupIcon = $derived(iconData()?.icon ?? FolderOpen);
</script>

{#if groupName}
  <Badge
    variant="outline"
    class="gap-1.5 text-xs"
    style="border-color: {groupColor || 'var(--border)'}">
    <GroupIcon class="h-3 w-3" style="color: {groupColor || 'currentColor'}" />
    {groupName}
  </Badge>
{:else}
  <span class="text-muted-foreground text-xs">—</span>
{/if}
