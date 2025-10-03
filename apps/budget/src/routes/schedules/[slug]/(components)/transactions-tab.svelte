<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import * as Table from '$lib/components/ui/table';
import { currencyFormatter } from '$lib/utils/formatters';
import type { PageData } from '../$types';

// Icons
import Receipt from '@lucide/svelte/icons/receipt';

let { schedule }: {
  schedule: PageData['schedule'];
} = $props();
</script>

{#if schedule}
<div class="space-y-4">
  {#if schedule.transactions.length > 0}
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm">Transaction History ({schedule.transactions.length})</Card.Title>
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
            {#each schedule.transactions as transaction}
              <Table.Row>
                <Table.Cell class="font-medium">
                  {new Date(transaction.date).toLocaleDateString()}
                </Table.Cell>
                <Table.Cell>
                  <span class="font-mono {transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
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
                    variant={transaction.status === 'cleared' ? 'default' :
                             transaction.status === 'pending' ? 'secondary' : 'outline'}
                    class="text-xs"
                  >
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
      <Receipt class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 class="text-lg font-semibold mb-2">No Transactions Yet</h3>
      <p class="text-muted-foreground mb-4">
        This schedule hasn't created any transactions yet
      </p>
      <Button variant="outline">
        Create Manual Transaction
      </Button>
    </Card.Root>
  {/if}
</div>
{/if}