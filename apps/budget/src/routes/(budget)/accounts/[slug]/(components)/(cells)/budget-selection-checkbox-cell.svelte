<script lang="ts">
import { Checkbox } from '$lib/components/ui/checkbox';
import type { Row, Table } from '@tanstack/table-core';

interface Props {
  row: Row<any>;
  table: Table<any>;
  disabled?: boolean;
}

let { row, disabled = false }: Props = $props();
</script>

<Checkbox
  checked={row.getIsSelected()}
  {disabled}
  onCheckedChange={(value) => row.toggleSelected(!!value)}
  aria-label="Select row" />
