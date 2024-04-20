<script lang="ts">
  import { Checkbox } from '$lib/components/ui/checkbox';
  import { page } from '$app/stores';
  import { currencyFormatter, dateFormatter } from '$lib/helpers/formatters';
  import type { PageData } from './$types';
  import * as Table from '$lib/components/ui/table';
  import EditableCell from '$lib/components/data-table/EditableCell.svelte';
  import EditableDateCell from '$lib/components/data-table/EditableDateCell.svelte';
  import EditableEntityCell from '$lib/components/data-table/EditableEntityCell.svelte';
  import EditableNumericCell from '$lib/components/data-table/EditableNumericCell.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { trpc } from '$lib/trpc/client';
  import { Input } from '$lib/components/ui/input';
  import * as Pagination from '$lib/components/ui/pagination';
  import type {
    EditableDateItem,
    EditableEntityItem,
    EditableNumericItem,
    TransactionsFormat
  } from '$lib/components/types';
  import AddTransactionDialog from '$lib/components/dialogs/AddTransactionDialog.svelte';
  import { compareAlphanumeric } from '$lib/utils';
  import DeleteTransactionDialog from '$lib/components/dialogs/DeleteTransactionDialog.svelte';
  import { savable } from '$lib/helpers/savable';
  import { getLocalTimeZone, type DateValue } from '@internationalized/date';
  import { setTransactionState } from '$lib/states/TransactionState.svelte';
  import { setCategoryState } from '$lib/states/CategoryState.svelte';
  import { setPayeeState } from '$lib/states/PayeeState.svelte';
  import { getCoreRowModel, type ColumnDef, type TableOptions, createSvelteTable, FlexRender, renderComponent, ColumnHeader, type SortingState, type Updater, getSortedRowModel, getPaginationRowModel, type PaginationState, type RowSelectionState, getFilteredRowModel, type FilterFn, type ColumnFiltersState } from '$lib/components/tanstack-svelte-table';
  import { rankItem, type RankItemOptions } from '@tanstack/match-sorter-utils';

  let { data }: { data: PageData } = $props();

  const transactionState = setTransactionState({
    transactions: data.account.transactions,
    manageTransactionForm: data.manageTransactionForm,
    deleteTransactionForm: data.deleteTransactionForm
  });

  const categoryState = setCategoryState({
    categories: data.categories,
    manageCategoryForm: data.manageCategoryForm,
    deleteCategoryForm: data.deleteCategoryForm
  });

  const payeeState = setPayeeState({
    payees: data.payees,
    managePayeeForm: data.managePayeeForm,
    deletePayeeForm: data.deletePayeeForm
  });

  const updateData = async (rowDataId: number, columnId: string, newValue?: unknown) => {
    const new_data = {
      [columnId]: newValue
    };
    if (columnId == 'amount') {
      new_data[columnId] = (newValue as EditableNumericItem).value as number;
    }
    if (columnId == 'date') {
      new_data[columnId] = dateFormatter.format((newValue as EditableDateItem).toDate(getLocalTimeZone()));
    }

    const idx = transactionState.transactions.map(el => el.id).indexOf(rowDataId);
    const updatedData = Object.assign({}, transactionState.transactions[idx], new_data);

    const updated_transaction = await trpc($page).transactionRoutes.save.mutate(savable(updatedData));
    if (updated_transaction)
      transactionState.transactions[idx] = updated_transaction;
  };

  const defaultColumns: ColumnDef<TransactionsFormat>[] = [
    {
      id: 'select-col',
      header: ({ table }) => renderComponent(Checkbox, {
        checked: table.getIsAllRowsSelected() ? true : (table.getIsSomeRowsSelected() ? 'indeterminate' : false),
        onclick: (e) => table.getToggleAllPageRowsSelectedHandler()(e)
      }),
      cell: ({ row }) => renderComponent(Checkbox, {
        checked: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        onclick: (e) => row.getToggleSelectedHandler()(e)
      }),
      enableColumnFilter: false,
    },
    {
      accessorKey: 'id',
      cell: info => info.getValue(),
      header: ({ header }) => renderComponent(ColumnHeader, { label: 'ID', header }),
      sortingFn: 'alphanumeric',
      enableColumnFilter: false,
    },
    {
      accessorFn: row => row.date,
      id: 'date',
      cell: info => renderComponent(EditableDateCell, {
        value: info.getValue() as DateValue,
        onUpdateValue: (new_value) => updateData(parseInt(info.row.id), 'date', new_value)
      }),
      header: ({ header }) => renderComponent(ColumnHeader, { label: 'Date', header }),
      sortingFn: 'datetime',
      enableColumnFilter: false,
    },
    {
      accessorFn: row => row.payeeId,
      id: 'payee',
      cell: info => renderComponent(EditableEntityCell, {
        value: payeeState.getById(info.getValue() as number) as EditableEntityItem,
        entityLabel: 'payee',
        onUpdateValue: (new_value) => updateData(parseInt(info.row.id), 'payeeId', new_value),
        entities: payeeState.payees as EditableEntityItem[],
      }),
      header: ({ header }) => renderComponent(ColumnHeader, { label: 'Payee', header }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(rowA.original.payee?.name || '', rowB.original.payee?.name || '');
      },
      enableColumnFilter: true,
    },
    {
      accessorFn: row => row.notes,
      id: 'notes',
      cell: info => renderComponent(EditableCell, {
        value: info.getValue(),
        onUpdateValue: (new_value) => updateData(parseInt(info.row.id), 'notes', new_value)
      }),
      header: ({ header }) => renderComponent(ColumnHeader, { label: 'Notes', header }),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      accessorFn: row => row.categoryId,
      id: 'category',
      cell: info => renderComponent(EditableEntityCell, {
        value: categoryState.getById(info.getValue() as number) as EditableEntityItem,
        entityLabel: 'categories',
        onUpdateValue: (new_value) => updateData(parseInt(info.row.id), 'categoryId', new_value),
        entities: categoryState.categories as EditableEntityItem[],
      }),
      header: ({ header }) => renderComponent(ColumnHeader, { label: 'Category', header }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(rowA.original.category?.name || '', rowB.original.category?.name || '');
      },
      enableColumnFilter: false,
    },
    {
      accessorFn: row => row.amount,
      id: 'amount',
      cell: info => renderComponent(EditableNumericCell, {
        value: info.getValue() as EditableNumericItem,
        onUpdateValue: (new_value) => updateData(parseInt(info.row.id), 'amount', new_value)
      }),
      header: ({ header }) => renderComponent(ColumnHeader, { label: 'Amount', header }),
      enableColumnFilter: false,
    },
  ];

  let sorting = $state<SortingState>([]);
  function setSorting(updater: Updater<SortingState>) {
    if (updater instanceof Function) {
      sorting = updater(sorting);
    } else sorting = updater
  };

  let pagination = $state<PaginationState>({
    pageIndex: 0,
    pageSize: 25
  });
  function setPagination(updater: Updater<PaginationState>) {
    if (updater instanceof Function) {
      pagination = updater(pagination);
    } else pagination = updater
  };

  let selection = $state<RowSelectionState>({});
  function setSelection(updater: Updater<RowSelectionState>) {
    if (updater instanceof Function) {
      selection = updater(selection);
    } else selection = updater
  };

  let filtering = $state<ColumnFiltersState>([]);
  function setFiltering(updater: Updater<ColumnFiltersState>) {
    if (updater instanceof Function) {
      filtering = updater(filtering);
    } else filtering = updater
  };

  let globalFilter = $state('');
  const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
    const opts: RankItemOptions = {
      accessors: undefined
    };
    if (columnId === 'payee') {
      opts['accessors'] = [(item) => { return $state.snapshot(payeeState.payees.find((payee) => payee.id === item))?.name + ''; }];
    }
    if (columnId === 'category') {
      opts['accessors'] = [(item) => { return $state.snapshot(categoryState.categories.find((category) => category.id === item))?.name + '' }];
    }

    // Rank the item
    const itemRank = rankItem(row.getValue(columnId), value, opts);

    // Store the itemRank info
    addMeta({ itemRank });

    // Return if the item should be filtered in/out
    return itemRank.passed;
  };

  function setGlobalFilter(updater: Updater<string>) {
    if (updater instanceof Function) {
      globalFilter = updater(globalFilter)
    } else globalFilter = updater
  };

  let options: TableOptions<TransactionsFormat> = $state({
    data: transactionState.formatted,
    columns: defaultColumns,
    state: {
      get sorting() {
        return sorting;
      },
      get pagination() {
        return pagination;
      },
      get rowSelection() {
        return selection;
      },
      get columnFilters() {
        return filtering;
      },
      get globalFilter() {
        return globalFilter
      },
    },
    initialState: {
      columnVisibility: {
        id: false
      }
    },
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    onColumnFiltersChange: setFiltering,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (originalRow) => originalRow.id.toString(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getFilteredRowModel: getFilteredRowModel(),
  });

  const table = createSvelteTable(options);

  let addTransactionDialogOpen: boolean = $state(false);
  let selectedTransactions: number[] = $derived(Object.keys(table.getSelectedRowModel().rowsById).map(id => parseInt(id)));
  let deleteTransactionDialogOpen = $state(false);

  $effect(() => {
    transactionState.transactions = data.account.transactions;
    options.data = transactionState.formatted;
  });
</script>

<div class="mb-2 flex items-center">
  <h1 class="mr-5 text-3xl">{data.account.name}</h1>
  <span class="text-sm text-muted-foreground"
    ><strong>Balance:</strong> {currencyFormatter.format(data.account.balance ?? 0)}</span
  >
</div>

<p class="mb-2 text-sm text-muted-foreground">{data.account.notes}</p>

<AddTransactionDialog
  account={data.account}
  bind:dialogOpen={addTransactionDialogOpen}
/>

<DeleteTransactionDialog
  transactions={selectedTransactions}
  bind:dialogOpen={deleteTransactionDialogOpen}
  bind:accountId={data.account.id}
  onDelete={() => table.resetRowSelection()}
/>

<div class="flex items-center py-4">
  <Button class="mx-1" onclick={() => (addTransactionDialogOpen = true)}>
    <span class="icon-[lucide--plus] mr-2 size-4"></span>
    Add
  </Button>
  <Button variant="outline" class="mx-1">
    <span class="icon-[lucide--import] mr-2 size-4"></span>
    Import
  </Button>

  <div class="grow"></div>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
      <Button
        variant="outline"
        builders={[builder]}
        disabled={selectedTransactions.length === 0}
      >
        <span class="icon-[lucide--chevron-down] mr-2 size-4"></span>
        {table.getSelectedRowModel().rows.length} selected
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-40">
      <DropdownMenu.Group>
        <DropdownMenu.Item>
          Archive
          <DropdownMenu.Shortcut>⇧⌘A</DropdownMenu.Shortcut>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onclick={() => {
            deleteTransactionDialogOpen = true;
          }}
        >
          Delete
          <DropdownMenu.Shortcut>⇧⌘D</DropdownMenu.Shortcut>
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<div class="flex items-center py-0">
  <Input
    class="max-w-sm"
    placeholder="Filter..."
    type="text"
    bind:value={globalFilter}
  />

  <div class="grow"></div>
</div>

<div class="p-2">
  <Table.Root>
    <Table.Header>
      {#each table.getHeaderGroups() as headerGroup}
        <Table.Row>
          {#each headerGroup.headers as header}
            <Table.Head>
              {#if !header.isPlaceholder}
                <FlexRender
                  content={header.column.columnDef.header}
                  context={header.getContext()}
                />
              {/if}
            </Table.Head>
          {/each}
        </Table.Row>
      {/each}
    </Table.Header>
    <Table.Body>
      {#each table.getRowModel().rows as row}
        <Table.Row>
          {#each row.getVisibleCells() as cell}
            <Table.Cell>
              <FlexRender
                content={cell.column.columnDef.cell}
                context={cell.getContext()}
              />
            </Table.Cell>
          {/each}
        </Table.Row>
      {/each}
    </Table.Body>
    <tfoot>
      {#each table.getFooterGroups() as footerGroup}
        <tr>
          {#each footerGroup.headers as header}
            <th colSpan={header.colSpan}>
              {#if !header.isPlaceholder}
                <FlexRender
                  content={header.column.columnDef.footer}
                  context={header.getContext()}
                />
              {/if}
            </th>
          {/each}
        </tr>
      {/each}
    </tfoot>
  </Table.Root>
  <div class="h-4"></div>
</div>

<div class="flex items-center justify-end space-x-2 py-4">
  <Pagination.Root
    class="mx-0 w-auto flex-row"
    count={transactionState.formatted.length}
    perPage={table.getState().pagination.pageSize}
    siblingCount={1}
    let:pages
    let:currentPage
    let:range
  >
    <p class="mr-2 text-[13px] text-muted-foreground">
      Showing {range.start + 1} - {range.end} of {transactionState.formatted.length}
    </p>

    <Pagination.Content>
      <Pagination.Item>
        <Pagination.PrevButton
          disabled={!table.getCanPreviousPage()}
          on:click={() => (table.previousPage())}
        >
          <span class="icon-[lucide--chevron-left] size-4"></span>
          <span class="hidden sm:block">Previous</span>
        </Pagination.PrevButton>
      </Pagination.Item>
      {#each pages as page (page.key)}
        {#if page.type === 'ellipsis'}
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
        {:else}
          <Pagination.Item>
            <Pagination.Link
              {page}
              isActive={currentPage == page.value}
              onclick={() => (table.setPageIndex(page.value - 1))}
            >
              {page.value}
            </Pagination.Link>
          </Pagination.Item>
        {/if}
      {/each}
      <Pagination.Item>
        <Pagination.NextButton
          disabled={!table.getCanNextPage()}
          on:click={() => (table.nextPage())}
        >
          <span class="hidden sm:block">Next</span>
          <span class="icon-[lucide--chevron-right] size-4"></span>
        </Pagination.NextButton>
      </Pagination.Item>
    </Pagination.Content>
  </Pagination.Root>
</div>
