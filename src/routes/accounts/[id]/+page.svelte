<!-- <script context="module" lang="ts">
  export function getPageTitle(data: any) {
    return data.data.account?.name;
  }
  // export const pageTitle = false;
</script> -->

<script lang="ts">
  import { page } from "$app/stores";
  import { currencyFormatter } from '$lib/helpers/formatters';
  import { type Account, type Payee, type Transaction, type Category } from '$lib/schema';
  import { writable } from 'svelte/store';
  import type { PageData } from './$types';
  import { createRender, createTable, Render, Subscribe, type DataLabel } from 'svelte-headless-table';
  import * as Table from '$lib/components/ui/table';
  import EditableCell from '$lib/components/data-table/EditableCell.svelte';
  import EditableDateCell from '$lib/components/data-table/EditableDateCell.svelte';
  import EditableEntityCell from '$lib/components/data-table/EditableEntityCell.svelte';
  import { addColumnFilters, addPagination, addSelectedRows, addSortBy, addTableFilter, type AnyPlugins } from 'svelte-headless-table/plugins';
  import { type DateValue, CalendarDate } from '@internationalized/date';
  import EditableNumericCell from '$lib/components/data-table/EditableNumericCell.svelte';
  import DataTableActions from '$lib/components/data-table/DataTableActions.svelte';
  import DataTableCheckbox from '$lib/components/data-table/DataTableCheckbox.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import Icon from '@iconify/svelte';
  import Kbd from '$lib/components/Kbd.svelte';
  import { trpc } from "$lib/trpc/client";
  import { Input } from "$lib/components/ui/input";
  import * as Pagination from "$lib/components/ui/pagination";
  import * as Dialog from "$lib/components/ui/dialog";
  import NewTransactionForm from "$lib/components/forms/NewTransactionForm.svelte";

  let { data } = $props<{ data: PageData }>();
  let account: Account = data.account;
  let accountBalance: number = $state(account.balance);
  let payees: Payee[] = data.payees;
  let categories: Category[] = data.categories;

  type TransactionsFormat = {
    id: number;
    amount: number | string;
    date: DateValue | undefined;
    payee: Payee | null;
    notes: string | null;
    category: Category | null;
  };

  const transactions_formatted: TransactionsFormat[] = account.transactions.map(
    (transaction: Transaction): TransactionsFormat => {
      const transaction_date = new Date(transaction.date);
      return {
        id: transaction.id,
        amount: currencyFormatter.format(Number(transaction.amount)),
        date: new CalendarDate(transaction_date.getFullYear(), transaction_date.getMonth(), transaction_date.getDate()),
        payee: transaction.payee,
        category: transaction.category,
        notes: transaction.notes
      };
    }
  );

  const updateData = async(rowDataId: number, columnId: string, newValue: unknown) => {
    let newAccountBalance = accountBalance;

    if (columnId == 'amount' && newAccountBalance) {
      newValue = parseFloat(newValue as string);
      newAccountBalance -= account.transactions[rowDataId].amount - newValue;
    }
    await trpc($page).transactionRoutes.save.mutate(
      Object.assign(
        {},
        account.transactions[rowDataId],
        {
          [columnId]: newValue,
          newAccountBalance: newAccountBalance || 0
        }
      )
    ).then(() => accountBalance = newAccountBalance);
  };

  const EditableDateCellLabel: DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined> | undefined = ({ column, row, value }) => {
    return createRender(EditableDateCell, {
      row,
      column,
      value,
      onUpdateValue: updateData,
    });
  };

  const EditablePayeeCellLabel: DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined> | undefined = ({ column, row, value }) => {
    return createRender(EditableEntityCell, {
      row,
      column,
      value,
      onUpdateValue: updateData,
      entities: payees.map((payee) => {
        return {
          value: payee.id.toString(),
          label: payee.name || ''
        }
      }),
      entityLabel: 'payees'
    });
  };

  const EditableCategoryCellLabel: DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined> | undefined = ({ column, row, value }) => {
    return createRender(EditableEntityCell, {
      row,
      column,
      value,
      onUpdateValue: updateData,
      entities: categories.map((category) => {
        return {
          value: category.id.toString(),
          label: category.name || ''
        }
      }),
      entityLabel: 'categories'
    });
  };

  const EditableNumericCellLabel: DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined> | undefined = ({ column, row, value }) => {
    return createRender(EditableNumericCell, {
      row,
      column,
      value,
      onUpdateValue: updateData,
    });
  };

  const EditableCellLabel: DataLabel<TransactionsFormat | unknown, AnyPlugins, string | undefined> | undefined = ({ column, row, value }) => {
    return createRender(EditableCell, {
      row,
      column,
      value,
      onUpdateValue: updateData,
    });
  };

  const table = createTable(writable(transactions_formatted), {
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
    sort: addSortBy(),
  });

  const columns = table.createColumns([
    table.column({
      header: (_, { pluginStates }) => {
        const { allPageRowsSelected } = pluginStates.select;
        return createRender(DataTableCheckbox, {
          checked: allPageRowsSelected
        });
      },
      accessor: "id",
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
          getSortValue: (value): string | number | (string|number)[] => {
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
            return value.name.toLowerCase().includes(filterValue.toLowerCase())
          }
        },
        filter: {
          getFilterValue: (value) => {
            return value.name;
          }
        },
        sort: {
          getSortValue: (value): string | number | (string|number)[] => {
            return value.name;
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
            return value.name.toLowerCase().includes(filterValue.toLowerCase())
          }
        },
        filter: {
          getFilterValue: (value) => {
            return value.name;
          }
        },
        sort: {
          getSortValue: (value): string | number | (string|number)[] => {
            return value.name;
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
          getSortValue: (value): string | number | (string|number)[] => {
            return parseFloat(value.replace('$', ''));
          }
        }
      }
    }),
    table.column({
      accessor: ({ id }) => id,
      header: "",
      cell: ({ value }) => {
        return createRender(DataTableActions, { id: value, actions: {
          edit: () => {
            console.log('edit');
          }
        } });
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
  const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates } = table.createViewModel(columns);
  const { filterValue } = pluginStates.filter;
  const { filterValues } = pluginStates.colFilter;
  const { hasNextPage, hasPreviousPage, pageIndex, pageSize, pageCount } = pluginStates.page;
  const { selectedDataIds } = pluginStates.select;

  let filterBy = $state({ payees: true, categories: true });
  let filterBySettings = $state('contains');
  let filterText: string = $state('');
  let filterdDisabled = $state(false);
  $effect(() => {
    filterdDisabled = !filterBy['payees'] && !filterBy['categories'];
  });
  const filter = () => {
    if (filterBy['payees'] && filterBy['categories']) {
      $filterValue = filterText;
    }
    else {
      if (filterBy['payees']) {
        $filterValues.payee = filterText;
      }
      if (filterBy['categories']) {
        $filterValues.category = filterText;
      }
    }
  }

  const refreshAccountBalance = async() => {
    const amount = account.transactions.reduce((total, current) => total + current.amount!, 0);
    account.balance = amount;
    accountBalance = amount;
    await trpc($page).accountRoutes.save.mutate(account);
  }

  let quickaction: string | undefined = $state();

  let addTransactionDialogOpen: boolean = $state(false);
</script>

<div class="flex items-center mb-2">
  <h1 class="text-3xl mr-5">{@html account.name}</h1>
  <span class="text-sm text-muted-foreground"><strong>Balance:</strong> {currencyFormatter.format(accountBalance ?? 0)}</span>
  <!-- <Button variant="outline" size="icon" class="ml-2" onclick={refreshAccountBalance}>
    <Icon icon="lucide:refresh-cw" class="w-4 h-4"/>
  </Button> -->
</div>

<p class="text-sm text-muted-foreground mb-2">{@html account.notes}</p>

<Dialog.Root bind:open={addTransactionDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Add Transaction</Dialog.Title>
      <Dialog.Description>
        <NewTransactionForm accountId={account.id}/>
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>

<div class="flex items-center py-4">
  <Button class="mx-1" onclick={() => addTransactionDialogOpen=true}>
    <Icon icon="lucide:plus" class="mr-2 w-4 h-4"/>
    Add
  </Button>
  <Button variant="outline" class="mx-1">
    <Icon icon="lucide:import" class="mr-2 w-4 h-4"/>
    Import
  </Button>

  <div class="grow"></div>

  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
      <Button variant="outline" builders={[builder]} disabled={Object.keys($selectedDataIds).length === 0}>
        <Icon icon="lucide:chevron-down" class="mr-2 w-4 h-4" />
        {Object.keys($selectedDataIds).length} selected
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-40">
      <DropdownMenu.Group>
        <DropdownMenu.Item>
          Archive
          <Kbd keys={['A']}/>
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          Duplicate
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          Delete
          <Kbd keys={['D']}/>
        </DropdownMenu.Item>
        <DropdownMenu.Item>
          Edit
          <Kbd keys={['E']}/>
        </DropdownMenu.Item>
      </DropdownMenu.Group>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
</div>

<div class="flex items-center py-0">
  <DropdownMenu.Root closeOnItemClick={false}>
    <DropdownMenu.Trigger asChild let:builder>
      <Button variant="outline" size="icon" builders={[builder]} class="mr-1" title="Filter by">
        <Icon icon="lucide:filter" class="w-4 h-4" />
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
      <Button variant="outline" size="icon" builders={[builder]} class="mr-1" title="Filter settings">
        <Icon icon="lucide:settings-2" class="w-4 h-4" />
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-40">
      <DropdownMenu.RadioGroup bind:value={filterBySettings}>
        <DropdownMenu.RadioItem value="contains">
          Contains
        </DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="startsWith">
          Starts with
        </DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="endsWith">
          Ends with
        </DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
  </DropdownMenu.Root>

  <Input
    class="max-w-sm"
    placeholder="Filter..."
    type="text"
    bind:value={filterText}
    onkeyup={filter}
    disabled={filterdDisabled}
  />

  <div class="grow"></div>
</div>

<div class="rounded-md border mt-4">
  <Table.Root {...$tableAttrs}>
    <Table.Header>
      {#each $headerRows as headerRow}
        <Subscribe rowAttrs={headerRow.attrs()}>
          <Table.Row>
            {#each headerRow.cells as cell (cell.id)}
              <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
                <Table.Head {...attrs}>
                  {#if cell.id == 'id' || cell.id == '' || cell.id == 'notes'}
                    <Render of={cell.render()} />
                  {:else}
                  <Button variant="ghost" on:click={props.sort.toggle}>
                    <Render of={cell.render()} />
                    <Icon icon="{props.sort.order == 'asc' ? 'lucide:arrow-up' : (props.sort.order == 'desc' ? 'lucide:arrow-down' : 'lucide:arrow-down-up')}" class={"ml-2 h-4 w-4"} />
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
          <Table.Row {...rowAttrs}
            {...rowAttrs}
            data-state={$selectedDataIds[row.id] && "selected"}
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
  <Pagination.Root class="w-auto mx-0 flex-row" count={transactions_formatted.length} perPage={$pageSize} siblingCount={1} let:pages let:currentPage let:range>
    <p class="text-[13px] text-muted-foreground mr-2">
      Showing {range.start + 1} - {range.end} of {transactions_formatted.length}
    </p>

    <Pagination.Content>
      <Pagination.Item>
        <Pagination.PrevButton disabled={!$hasPreviousPage} onclick={() => ($pageIndex = $pageIndex - 1)}>
          <Icon icon="lucide:chevron-left" class="h-4 w-4" />
          <span class="hidden sm:block">Previous</span>
        </Pagination.PrevButton>
      </Pagination.Item>
      {#each pages as page (page.key)}
        {#if page.type === "ellipsis"}
          <Pagination.Item>
            <Pagination.Ellipsis />
          </Pagination.Item>
        {:else}
          <Pagination.Item>
            <Pagination.Link {page} isActive={currentPage == page.value} onclick={() => ($pageIndex = page.value - 1)}>
              {page.value}
            </Pagination.Link>
          </Pagination.Item>
        {/if}
      {/each}
      <Pagination.Item>
        <Pagination.NextButton disabled={!$hasNextPage} onclick={() => ($pageIndex = $pageIndex + 1)}>
          <span class="hidden sm:block">Next</span>
          <Icon icon="lucide:chevron-right" class="h-4 w-4" />
        </Pagination.NextButton>
      </Pagination.Item>
    </Pagination.Content>
  </Pagination.Root>
</div>
