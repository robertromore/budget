<script lang="ts" generics="TData, TValue">
import DataTableColumnHeader from '$lib/components/shared/data-table/data-table-column-header.svelte';
import type {HTMLAttributes} from 'svelte/elements';
import type {Column} from '@tanstack/table-core';
import type {WithoutChildren} from 'bits-ui';

interface Props extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

let props: WithoutChildren<Props> = $props();
</script>

<DataTableColumnHeader {...props} />
