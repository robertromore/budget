<script lang="ts" generics="TData">
  import { page } from '$app/stores';
  import { currencyFormatter, dateFormatter, transactionFormatter } from '$lib/helpers/formatters';
  import { writable } from 'svelte/store';
  import type { PageData } from './$types';
  import {
    createRender,
    createTable,
    Render,
    Subscribe,
    type DataLabel,
    BodyRow,
    DataColumn
  } from 'svelte-headless-table';
  import * as Table from '$lib/components/ui/table';
  import EditableCell from '$lib/components/data-table/EditableCell.svelte';
  import EditableDateCell from '$lib/components/data-table/EditableDateCell.svelte';
  import EditableEntityCell from '$lib/components/data-table/EditableEntityCell.svelte';
  import {
    addColumnFilters,
    addPagination,
    addSelectedRows,
    addSortBy,
    addTableFilter,
    type AnyPlugins
  } from 'svelte-headless-table/plugins';
  import EditableNumericCell from '$lib/components/data-table/EditableNumericCell.svelte';
  import DataTableActions from '$lib/components/data-table/DataTableActions.svelte';
  import DataTableCheckbox from '$lib/components/data-table/DataTableCheckbox.svelte';
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
  import { cn, compareAlphanumeric } from '$lib/utils';
  import { invalidate } from '$app/navigation';
  import { payees, type Payee, type Transaction } from '$lib/schema';
  import DeleteTransactionDialog from '$lib/components/dialogs/DeleteTransactionDialog.svelte';
  import { savable } from '$lib/helpers/savable';
  import { getLocalTimeZone, type DateValue } from '@internationalized/date';
  import { setTransactionState } from '$lib/states/TransactionState.svelte';
  import { setCategoryState } from '$lib/states/CategoryState.svelte';
  import { setPayeeState } from '$lib/states/PayeeState.svelte';
  import { getCoreRowModel, type ColumnDef, type TableOptions, createSvelteTable, FlexRender, renderComponent, Header, type SortingState, type Updater, getSortedRowModel, getPaginationRowModel, type PaginationState } from '$lib/components/tanstack-svelte-table';

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
      accessorKey: 'id',
      cell: info => info.getValue(),
      header: header => renderComponent(Header, { label: 'ID', header }),
      sortingFn: 'alphanumeric',
    },
    {
      accessorFn: row => row.date,
      id: 'date',
      cell: info => renderComponent(EditableDateCell, {
        value: info.getValue() as DateValue,
        onUpdateValue: (new_value) => updateData(parseInt(info.row.id), 'date', new_value)
      }),
      header: ({ header }) => renderComponent(Header, { label: 'Date', header }),
      sortingFn: 'datetime',
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
      header: ({ header }) => renderComponent(Header, { label: 'Payee', header }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(rowA.original.payee?.name || '', rowB.original.payee?.name || '');
      },
    },
    {
      accessorFn: row => row.notes,
      id: 'notes',
      cell: info => renderComponent(EditableCell, {
        value: info.getValue(),
        onUpdateValue: (new_value) => updateData(parseInt(info.row.id), 'notes', new_value)
      }),
      header: ({ header }) => renderComponent(Header, { label: 'Notes', header }),
      enableSorting: false
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
      header: ({ header }) => renderComponent(Header, { label: 'Category', header }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(rowA.original.category?.name || '', rowB.original.category?.name || '');
      },
    },
    {
      accessorFn: row => row.amount,
      id: 'amount',
      cell: info => renderComponent(EditableNumericCell, {
        value: info.getValue() as EditableNumericItem,
        onUpdateValue: (new_value) => updateData(parseInt(info.row.id), 'amount', new_value)
      }),
      header: ({ header }) => renderComponent(Header, { label: 'Amount', header }),
      sortingFn: 'alphanumeric'
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

  let options: TableOptions<TransactionsFormat> = {
    data: transactionState.formatted,
    columns: defaultColumns,
    state: {
      get sorting() {
        return sorting;
      },
      get pagination() {
        return pagination;
      }
    },
    initialState: {
      columnVisibility: {
        id: false
      }
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (originalRow) => originalRow.id.toString()
  };

  let table = $state(createSvelteTable(options));

  $effect(() => {
    // Needed to update table when navigating to different account.
    transactionState.transactions = data.account.transactions;
    options.data = transactionState.formatted;
    table = createSvelteTable(options);
  });
</script>

<div class="mb-2 flex items-center">
  <h1 class="mr-5 text-3xl">{data.account.name}</h1>
  <span class="text-sm text-muted-foreground"
    ><strong>Balance:</strong> {currencyFormatter.format(data.account.balance ?? 0)}</span
  >
</div>

<p class="mb-2 text-sm text-muted-foreground">{data.account.notes}</p>

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
  <div class="h-4" />
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
