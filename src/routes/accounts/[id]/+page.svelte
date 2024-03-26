<script lang="ts">
  import { page } from '$app/stores';
  import { currencyFormatter, transactionFormatter } from '$lib/helpers/formatters';
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
    EditableEntityItem,
    EditableNumericItem,
    TransactionsFormat
  } from '$lib/components/types';
  import AddTransactionDialog from '$lib/components/dialogs/AddTransactionDialog.svelte';
  import { cn } from '$lib/utils';
  import { invalidate } from '$app/navigation';
  import { type Transaction } from '$lib/schema';
  import DeleteTransactionDialog from '$lib/components/dialogs/DeleteTransactionDialog.svelte';
  import { savable } from '$lib/helpers/savable';
  import type { DateValue } from '@internationalized/date';
  import { setTransactionState } from '$lib/states/TransactionState.svelte';
  import { setCategoryState } from '$lib/states/CategoryState.svelte';
  import { setPayeeState } from '$lib/states/PayeeState.svelte';

  let { data }: { data: PageData } = $props();
  // $inspect(data);

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

  // let transactions = transactionState.transactions;
  // let transactions_formatted: TransactionsFormat[] = transactionFormatter(transactions);
  let transactions_formatted_store = writable(transactionState.formatted);

  let onTransactionAdded = (new_entity: Transaction) => {
    invalidate('account');
    $transactions_formatted_store.push(...transactionFormatter([new_entity]));
    $transactions_formatted_store = $transactions_formatted_store;
  };

  let onTransactionDeleted = (entities: Transaction[]) => {
    invalidate('account');
    const entity_ids = entities.map((entity) => entity.id);
    $transactions_formatted_store = $transactions_formatted_store.filter(
      (value: TransactionsFormat) => {
        return !entity_ids.includes(value.id);
      }
    );
  };

  const updateData = async (rowDataId: number, columnId: string, newValue: unknown) => {
    const new_data = {
      [columnId]: newValue
    };
    if (columnId == 'amount') {
      new_data[columnId] = (newValue as EditableNumericItem).value as number;
    }

    const updateData = Object.assign({}, data.account.transactions[rowDataId], new_data);
    await trpc($page).transactionRoutes.save.mutate(savable(updateData));

    await invalidate('account');
  };

  const EditableDateCellLabel:
    | DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined>
    | undefined = ({ column, row, value }) => {
    return createRender(EditableDateCell, {
      row: row as BodyRow<DateValue, AnyPlugins>,
      column: column as DataColumn<DateValue, AnyPlugins, any, any>,
      value: value as DateValue | undefined,
      onUpdateValue: updateData
    });
  };

  const EditablePayeeCellLabel:
    | DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined>
    | undefined = ({ column, row, value }) => {
    return createRender(EditableEntityCell, {
      row: row as BodyRow<EditableEntityItem, AnyPlugins>,
      column: column as DataColumn<EditableEntityItem, AnyPlugins, any, any>,
      value: value as unknown as EditableEntityItem,
      onUpdateValue: updateData,
      entityLabel: 'payees',
    });
  };

  const EditableCategoryCellLabel:
    | DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined>
    | undefined = ({ column, row, value }) => {
    return createRender(EditableEntityCell, {
      row: row as BodyRow<EditableEntityItem, AnyPlugins>,
      column: column as DataColumn<EditableEntityItem, AnyPlugins, any, any>,
      value: value as unknown as EditableEntityItem,
      onUpdateValue: updateData,
      entityLabel: 'categories',
    });
  };

  const EditableNumericCellLabel:
    | DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined>
    | undefined = ({ column, row, value }) => {
    return createRender(EditableNumericCell, {
      row: row as BodyRow<EditableNumericItem, AnyPlugins>,
      column: column as DataColumn<EditableNumericItem, AnyPlugins, any, any>,
      value: value as EditableNumericItem | undefined,
      onUpdateValue: updateData
    });
  };

  const EditableCellLabel:
    | DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined>
    | undefined = ({ column, row, value }) => {
    return createRender(EditableCell, {
      row,
      column,
      value,
      onUpdateValue: updateData
    });
  };

  const table = createTable(transactions_formatted_store, {
    filter: addTableFilter({
      fn: ({ filterValue, value }) => {
        if (filterBySettings === 'startsWith') {
          return value.toLowerCase().startsWith(filterValue.toLowerCase());
        }
        if (filterBySettings === 'endsWith') {
          return value.toLowerCase().endsWith(filterValue.toLowerCase());
        }
        return value.toLowerCase().includes(filterValue.toLowerCase());
      }
    }),
    colFilter: addColumnFilters(),
    page: addPagination({
      initialPageSize: 25
    }),
    select: addSelectedRows(),
    sort: addSortBy()
  });

  const columns = table.createColumns([
    table.column({
      header: (_, { pluginStates }) => {
        const { allPageRowsSelected } = pluginStates.select;
        return createRender(DataTableCheckbox, {
          checked: allPageRowsSelected
        });
      },
      accessor: 'id',
      cell: ({ row }, { pluginStates }) => {
        const { getRowState } = pluginStates.select;
        const { isSelected } = getRowState(row);

        return createRender(DataTableCheckbox, {
          checked: isSelected
        });
      },
      plugins: {
        sort: {
          disable: true
        },
        filter: {
          exclude: true
        }
      }
    }),
    table.column({
      accessor: 'date',
      header: 'Date',
      cell: EditableDateCellLabel,
      plugins: {
        filter: {
          exclude: true
        },
        sort: {
          getSortValue: (value): string | number | (string | number)[] => {
            return value.toDate();
          }
        }
      }
    }),
    table.column({
      accessor: 'payee',
      header: 'Payee',
      cell: EditablePayeeCellLabel,
      plugins: {
        colFilter: {
          fn: ({ filterValue, value }) => {
            return value?.name.toLowerCase().includes(filterValue.toLowerCase());
          }
        },
        filter: {
          getFilterValue: (value) => {
            return value?.name;
          }
        },
        sort: {
          getSortValue: (value): string | number | (string | number)[] => {
            return value?.name;
          }
        }
      }
    }),
    table.column({
      accessor: 'notes',
      header: 'Notes',
      cell: EditableCellLabel,
      plugins: {
        sort: {
          disable: true
        }
      }
    }),
    table.column({
      accessor: 'category',
      header: 'Category',
      cell: EditableCategoryCellLabel,
      plugins: {
        colFilter: {
          fn: ({ filterValue, value }) => {
            return value?.name.toLowerCase().includes(filterValue.toLowerCase());
          }
        },
        filter: {
          getFilterValue: (value) => {
            return value?.name;
          }
        },
        sort: {
          getSortValue: (value): string | number | (string | number)[] => {
            return value?.name;
          }
        }
      }
    }),
    table.column({
      accessor: 'amount',
      header: 'Amount',
      cell: EditableNumericCellLabel,
      plugins: {
        filter: {
          exclude: true
        },
        sort: {
          getSortValue: (value): string | number | (string | number)[] => {
            return value.value;
          }
        }
      }
    }),
    table.column({
      accessor: ({ id }) => id,
      header: '',
      cell: ({ value }) => {
        return createRender(DataTableActions, {
          ids: [value],
          actions: {
            delete: (ids: number[]) => {
              deleteTransactions = transactionState.transactions.filter((tx: Transaction) => ids.includes(tx.id));
              deleteTransactionDialogOpen = true;
            }
          }
        });
      },
      plugins: {
        sort: {
          disable: true
        },
        filter: {
          exclude: true
        }
      }
    })
  ]);

  const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates } =
    table.createViewModel(columns);
  const { filterValue } = pluginStates.filter;
  const { filterValues } = pluginStates.colFilter;
  const { hasNextPage, hasPreviousPage, pageIndex, pageSize } = pluginStates.page;
  const { selectedDataIds } = pluginStates.select;

  let filterBy = $state({ payees: true, categories: true });
  let filterBySettings = $state('contains');
  let filterText: string = $state('');
  let filterDisabled: boolean = $state(false);
  $effect(() => {
    filterDisabled = !filterBy['payees'] && !filterBy['categories'];
  });
  const filter = () => {
    if (filterBy['payees'] && filterBy['categories']) {
      $filterValue = filterText;
    } else {
      if (filterBy['payees']) {
        $filterValues.payee = filterText;
      }
      if (filterBy['categories']) {
        $filterValues.category = filterText;
      }
    }
  };

  const refreshAccountBalance = async () => {
    const amount = data.account.transactions.reduce(
      (total: number, current: Transaction) => total + current.amount!,
      0
    );
    data.account.balance = amount;
    await trpc($page).accountRoutes.save.mutate(data.account);
  };

  let quickaction: string | undefined = $state();
  let addTransactionDialogOpen: boolean = $state(false);

  let deleteTransactions: Transaction[] | null = $state(null);
  let deleteTransactionDialogOpen = $state(false);
</script>

<div class="mb-2 flex items-center">
  <h1 class="mr-5 text-3xl">{data.account.name}</h1>
  <span class="text-sm text-muted-foreground"
    ><strong>Balance:</strong> {currencyFormatter.format(data.account.balance ?? 0)}</span
  >
  <!-- <Button variant="outline" size="icon" class="ml-2" onclick={refreshAccountBalance}>
    <span class="s-4 icon-[lucide--refresh-cw]" />
  </Button> -->
</div>

<p class="mb-2 text-sm text-muted-foreground">{data.account.notes}</p>

<AddTransactionDialog
  account={data.account}
  bind:dialogOpen={addTransactionDialogOpen}
  {onTransactionAdded}
/>

<DeleteTransactionDialog
  bind:transactions={deleteTransactions!}
  bind:dialogOpen={deleteTransactionDialogOpen}
  bind:accountId={data.account.id}
  bind:accountBalance={data.account.balance}
  {onTransactionDeleted}
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
        disabled={Object.keys($selectedDataIds).length === 0}
      >
        <span class="icon-[lucide--chevron-down] mr-2 size-4"></span>
        {Object.keys($selectedDataIds).length} selected
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-40">
      <DropdownMenu.Group>
        <DropdownMenu.Item>
          Archive
          <DropdownMenu.Shortcut>⇧⌘A</DropdownMenu.Shortcut>
        </DropdownMenu.Item>
        <!-- <DropdownMenu.Item>Duplicate</DropdownMenu.Item> -->
        <DropdownMenu.Item
          onclick={() => {
            deleteTransactions = Object.keys($selectedDataIds).map(
              (id) => transactionState.transactions[parseInt(id)]
            );
            deleteTransactionDialogOpen = true;
          }}
        >
          Delete
          <DropdownMenu.Shortcut>⇧⌘D</DropdownMenu.Shortcut>
        </DropdownMenu.Item>
        <!-- <DropdownMenu.Item>
          Edit
          <DropdownMenu.Shortcut>⇧⌘E</DropdownMenu.Shortcut>
        </DropdownMenu.Item> -->
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<div class="flex items-center py-0">
  <DropdownMenu.Root closeOnItemClick={false}>
    <DropdownMenu.Trigger asChild let:builder>
      <Button variant="outline" size="icon" builders={[builder]} class="mr-1" title="Filter by">
        <span class="icon-[lucide--filter] size-4"></span>
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-40">
      <DropdownMenu.Group>
        <DropdownMenu.CheckboxItem bind:checked={filterBy['payees']}>
          Payees
        </DropdownMenu.CheckboxItem>
        <DropdownMenu.CheckboxItem bind:checked={filterBy['categories']}>
          Categories
        </DropdownMenu.CheckboxItem>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>

  <DropdownMenu.Root closeOnItemClick={false}>
    <DropdownMenu.Trigger asChild let:builder>
      <Button
        variant="outline"
        size="icon"
        builders={[builder]}
        class="mr-1"
        title="Filter settings"
      >
        <span class="icon-[lucide--settings-2] size-4"></span>
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-40">
      <DropdownMenu.RadioGroup bind:value={filterBySettings}>
        <DropdownMenu.RadioItem value="contains">Contains</DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="startsWith">Starts with</DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="endsWith">Ends with</DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
  </DropdownMenu.Root>

  <Input
    class="max-w-sm"
    placeholder="Filter..."
    type="text"
    bind:value={filterText}
    onkeyup={filter}
    disabled={filterDisabled}
  />

  <div class="grow"></div>
</div>

<div class="mt-4 rounded-md border">
  <Table.Root {...$tableAttrs}>
    <Table.Header>
      {#each $headerRows as headerRow}
        <Subscribe rowAttrs={headerRow.attrs()}>
          <Table.Row>
            {#each headerRow.cells as cell (cell.id)}
              <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
                <Table.Head {...attrs}>
                  {#if cell.id == ''}{:else if cell.id == 'id' || cell.id == 'notes'}
                    <Render of={cell.render()} />
                  {:else}
                    <Button variant="ghost" on:click={props.sort.toggle}>
                      <Render of={cell.render()} />
                      <span
                        class={cn(
                          props.sort.order == 'asc'
                            ? 'icon-[lucide--arrow-up]'
                            : props.sort.order == 'desc'
                              ? 'icon-[lucide--arrow-down]'
                              : 'icon-[lucide--arrow-down-up]',
                          'ml-2 size-4'
                        )}
                      ></span>
                    </Button>
                  {/if}
                </Table.Head>
              </Subscribe>
            {/each}
          </Table.Row>
        </Subscribe>
      {/each}
    </Table.Header>
    <Table.Body {...$tableBodyAttrs}>
      {#each $pageRows as row (row.id)}
        <Subscribe rowAttrs={row.attrs()} let:rowAttrs>
          <Table.Row
            {...rowAttrs}
            {...rowAttrs}
            data-state={$selectedDataIds[row.id] && 'selected'}
          >
            {#each row.cells as cell (cell.id)}
              <Subscribe attrs={cell.attrs()} let:attrs>
                <Table.Cell {...attrs}>
                  <Render of={cell.render()} />
                </Table.Cell>
              </Subscribe>
            {/each}
          </Table.Row>
        </Subscribe>
      {/each}
    </Table.Body>
  </Table.Root>
</div>

<div class="flex items-center justify-end space-x-2 py-4">
  <Pagination.Root
    class="mx-0 w-auto flex-row"
    count={transactionState.formatted.length}
    perPage={$pageSize}
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
          disabled={!$hasPreviousPage}
          onclick={() => ($pageIndex = $pageIndex - 1)}
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
              onclick={() => ($pageIndex = page.value - 1)}
            >
              {page.value}
            </Pagination.Link>
          </Pagination.Item>
        {/if}
      {/each}
      <Pagination.Item>
        <Pagination.NextButton
          disabled={!$hasNextPage}
          onclick={() => ($pageIndex = $pageIndex + 1)}
        >
          <span class="hidden sm:block">Next</span>
          <span class="icon-[lucide--chevron-right] size-4"></span>
        </Pagination.NextButton>
      </Pagination.Item>
    </Pagination.Content>
  </Pagination.Root>
</div>
