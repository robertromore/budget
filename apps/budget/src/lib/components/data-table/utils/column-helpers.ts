import type { ColumnDef } from '@tanstack/table-core';
import type { SimpleColumnDef } from '../state/types';

/**
 * Converts a simplified column definition to a full TanStack Table column definition
 */
export function createColumn<TData>(config: SimpleColumnDef<TData>): ColumnDef<TData> {
	const column: ColumnDef<TData> = {
		id: config.id,
		header: config.header,
		...(config.accessorKey && { accessorKey: config.accessorKey as string }),
		...(config.cell && { cell: config.cell }),
		...(config.sortingFn && { sortingFn: config.sortingFn }),
		...(config.filterFn && { filterFn: config.filterFn }),
		meta: {
			...config.meta,
			headerClass: config.headerClass,
			cellClass: config.cellClass,
		},
	};

	// Apply feature flags
	if (config.sortable !== undefined) {
		column.enableSorting = config.sortable;
	}

	if (config.filterable !== undefined) {
		column.enableColumnFilter = config.filterable;
	}

	if (config.hideable !== undefined) {
		column.enableHiding = config.hideable;
	}

	return column;
}

/**
 * Converts multiple simplified column definitions to full TanStack Table column definitions
 */
export function createColumns<TData>(configs: SimpleColumnDef<TData>[]): ColumnDef<TData>[] {
	return configs.map((config) => createColumn(config));
}

/**
 * Creates a basic text column with common defaults
 */
export function textColumn<TData>(
	id: string,
	header: string,
	accessorKey: keyof TData,
	options?: Partial<SimpleColumnDef<TData>>
): ColumnDef<TData> {
	return createColumn({
		id,
		header,
		accessorKey,
		sortable: true,
		filterable: true,
		hideable: true,
		...options,
	});
}

/**
 * Creates a numeric column with common defaults
 */
export function numberColumn<TData>(
	id: string,
	header: string,
	accessorKey: keyof TData,
	options?: Partial<SimpleColumnDef<TData>>
): ColumnDef<TData> {
	return createColumn({
		id,
		header,
		accessorKey,
		sortable: true,
		filterable: true,
		hideable: true,
		...options,
	});
}

/**
 * Creates a date column with common defaults
 */
export function dateColumn<TData>(
	id: string,
	header: string,
	accessorKey: keyof TData,
	options?: Partial<SimpleColumnDef<TData>>
): ColumnDef<TData> {
	return createColumn({
		id,
		header,
		accessorKey,
		sortable: true,
		filterable: true,
		hideable: true,
		...options,
	});
}

/**
 * Creates an action column (typically not sortable/filterable)
 */
export function actionColumn<TData>(
	id: string = 'actions',
	cell: ColumnDef<TData>['cell'],
	header: string = ''
): ColumnDef<TData> {
	return createColumn({
		id,
		header,
		cell,
		sortable: false,
		filterable: false,
		hideable: false,
	});
}
