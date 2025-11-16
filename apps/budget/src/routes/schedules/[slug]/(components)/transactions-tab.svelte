<script lang="ts">
import * as Card from '$lib/components/ui/card';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import * as Table from '$lib/components/ui/table';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import TransactionWizard from '$lib/components/wizard/transaction-wizard.svelte';
import {currencyFormatter} from '$lib/utils/formatters';
import {createTransaction} from '$lib/query/transactions';
import {CategoriesState, PayeesState} from '$lib/states/entities';
// Icons
import Receipt from '@lucide/svelte/icons/receipt';

interface ScheduleWithTransactions {
  id: number;
  accountId: number;
  payeeId: number;
  categoryId: number | null;
  amount: number;
  transactions: Array<{
    id: number;
    date: string;
    amount: number;
    status: string;
    payee: {id: number; name: string} | null;
    category: {id: number; name: string} | null;
  }>;
}

let {
  schedule,
}: {
  schedule: ScheduleWithTransactions | null;
} = $props();

// Entity states for wizard
const categoriesState = CategoriesState.get();
const payeesState = PayeesState.get();
const categories = $derived(categoriesState?.all || []);
const payees = $derived(payeesState?.all || []);

// Sheet state
let wizardSheetOpen = $state(false);

// Create transaction mutation
const createTransactionMutation = createTransaction.options();

// Handle wizard completion
const handleWizardComplete = async (data: Record<string, any>) => {
  try {
    await createTransactionMutation.mutateAsync({
      accountId: data['accountId'],
      date: data['date'],
      amount: data['amount'],
      payeeId: data['payeeId'] || null,
      categoryId: data['categoryId'] || null,
      notes: data['notes'] || null,
      status: data['status'] || 'pending',
      scheduleId: schedule?.id || null,
    });
    wizardSheetOpen = false;
  } catch (error) {
    console.error('Failed to create transaction:', error);
  }
};
</script>

{#if schedule}
  <div class="space-y-4">
    {#if schedule.transactions?.length > 0}
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="text-sm"
            >Transaction History ({schedule.transactions?.length ?? 0})</Card.Title>
          <Card.Description class="text-xs">
            Complete list of transactions created by this schedule
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Date</Table.Head>
                <Table.Head>Amount</Table.Head>
                <Table.Head>Payee</Table.Head>
                <Table.Head>Category</Table.Head>
                <Table.Head>Status</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each schedule.transactions ?? [] as transaction}
                <Table.Row>
                  <Table.Cell class="font-medium">
                    {new Date(transaction.date).toLocaleDateString()}
                  </Table.Cell>
                  <Table.Cell>
                    <span
                      class="font-mono {transaction.amount >= 0
                        ? 'text-green-600'
                        : 'text-red-600'}">
                      {currencyFormatter.format(transaction.amount)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    {transaction.payee?.name || 'Unknown Payee'}
                  </Table.Cell>
                  <Table.Cell>
                    {#if transaction.category}
                      <Badge variant="secondary" class="text-xs">
                        {transaction.category.name}
                      </Badge>
                    {:else}
                      <span class="text-muted-foreground text-sm">No category</span>
                    {/if}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      variant={transaction.status === 'cleared'
                        ? 'default'
                        : transaction.status === 'pending'
                          ? 'secondary'
                          : 'outline'}
                      class="text-xs">
                      {transaction.status}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>
    {:else}
      <Card.Root class="p-8 text-center">
        <Receipt class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h3 class="mb-2 text-lg font-semibold">No Transactions Yet</h3>
        <p class="text-muted-foreground mb-4">This schedule hasn't created any transactions yet</p>
        <Button variant="outline" onclick={() => (wizardSheetOpen = true)}>
          Create Manual Transaction
        </Button>
      </Card.Root>
    {/if}
  </div>
{/if}

<ResponsiveSheet bind:open={wizardSheetOpen}>
  {#snippet header()}
    <h2 class="text-lg font-semibold">Create Manual Transaction</h2>
    <p class="text-muted-foreground text-sm">Create a transaction for this schedule</p>
  {/snippet}

  {#snippet content()}
    {#if schedule}
      <TransactionWizard
        accountId={schedule.accountId}
        initialData={{
          payeeId: schedule.payeeId,
          categoryId: schedule.categoryId,
          amount: schedule.amount,
        }}
        {payees}
        {categories}
        onComplete={handleWizardComplete} />
    {/if}
  {/snippet}
</ResponsiveSheet>
