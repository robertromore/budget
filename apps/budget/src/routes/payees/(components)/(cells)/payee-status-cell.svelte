<script lang="ts">
import EntityStatusCell from '$lib/components/shared/data-table/cells/entity-status-cell.svelte';

interface Props {
  isActive: boolean;
}

let { isActive }: Props = $props();
</script>

<EntityStatusCell {isActive} />
