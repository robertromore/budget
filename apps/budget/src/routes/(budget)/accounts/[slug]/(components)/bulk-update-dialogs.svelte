<!--
  Bulk Update Dialogs — payee + category bulk-update prompts that fire
  from `updateTransactionData` when the user changes a transaction's
  payee/category and similar transactions exist. The parent owns the
  state shape and passes it bindable so its update-handler can open
  either dialog by writing to the bound state. The confirm/cancel
  handlers + their mutations live here.
-->
<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import { rpc } from '$lib/query';

export type BulkPayeeDialogState = {
  open: boolean;
  transactionId: number;
  payeeId: number | null;
  payeeName: string | null;
  originalPayeeName: string;
  matchCount: number;
  newPayeeDefaultCategoryId: number | null;
  newPayeeDefaultCategoryName: string | null;
  updateCategories: boolean;
};

export type BulkCategoryDialogState = {
  open: boolean;
  transactionId: number;
  categoryId: number | null;
  categoryName: string | null;
  originalPayeeName: string;
  matchCountByPayee: number;
  matchCountByCategory: number;
  previousCategoryId: number | null;
};

interface Props {
  payeeDialog: BulkPayeeDialogState;
  categoryDialog: BulkCategoryDialogState;
  accountId: number | undefined;
}

let {
  payeeDialog = $bindable(),
  categoryDialog = $bindable(),
  accountId,
}: Props = $props();

const bulkUpdatePayeeMutation = rpc.transactions.bulkUpdatePayee.options();
const bulkUpdateCategoryMutation = rpc.transactions.bulkUpdateCategory.options();
const updateTransactionMutation = rpc.transactions.updateTransactionWithBalance.options();

async function confirmBulkPayeeUpdate() {
  if (!payeeDialog.transactionId || !accountId) return;
  try {
    await bulkUpdatePayeeMutation.mutateAsync({
      accountId: Number(accountId),
      transactionId: payeeDialog.transactionId,
      newPayeeId: payeeDialog.payeeId,
      originalPayeeName: payeeDialog.originalPayeeName,
    });

    if (payeeDialog.updateCategories && payeeDialog.newPayeeDefaultCategoryId) {
      await updateTransactionMutation.mutateAsync({
        id: payeeDialog.transactionId,
        data: { categoryId: payeeDialog.newPayeeDefaultCategoryId },
      });

      await bulkUpdateCategoryMutation.mutateAsync({
        accountId: Number(accountId),
        transactionId: payeeDialog.transactionId,
        newCategoryId: payeeDialog.newPayeeDefaultCategoryId,
        matchBy: 'payee',
      });
    }

    payeeDialog.open = false;
  } catch {
    // Mutation surfaces the error via toast.
  }
}

function cancelBulkPayeeUpdate() {
  payeeDialog.open = false;
}

async function confirmBulkCategoryUpdateByPayee() {
  if (!categoryDialog.transactionId || !accountId) return;
  try {
    await bulkUpdateCategoryMutation.mutateAsync({
      accountId: Number(accountId),
      transactionId: categoryDialog.transactionId,
      newCategoryId: categoryDialog.categoryId,
      matchBy: 'payee',
    });
    categoryDialog.open = false;
  } catch {
    // Mutation surfaces the error via toast.
  }
}

async function confirmBulkCategoryUpdateByCategory() {
  if (!categoryDialog.transactionId || !accountId) return;
  try {
    await bulkUpdateCategoryMutation.mutateAsync({
      accountId: Number(accountId),
      transactionId: categoryDialog.transactionId,
      newCategoryId: categoryDialog.categoryId,
      matchBy: 'category',
      ...(categoryDialog.previousCategoryId && {
        matchValue: categoryDialog.previousCategoryId,
      }),
    });
    categoryDialog.open = false;
  } catch {
    // Mutation surfaces the error via toast.
  }
}

function confirmBulkCategoryUpdateJustOne() {
  categoryDialog.open = false;
}

function cancelBulkCategoryUpdate() {
  categoryDialog.open = false;
}
</script>

<!-- Bulk Payee Update Dialog -->
<AlertDialog.Root bind:open={payeeDialog.open}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Update Similar Transactions?</AlertDialog.Title>
      <AlertDialog.Description>
        Found {payeeDialog.matchCount} other transaction{payeeDialog.matchCount !== 1 ? 's' : ''}
        with payee "{payeeDialog.originalPayeeName}".
        <br /><br />
        Would you like to update {payeeDialog.matchCount !== 1 ? 'them' : 'it'} to payee "{payeeDialog.payeeName ||
          'None'}" as well?
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if payeeDialog.newPayeeDefaultCategoryId}
      <div class="bg-muted/50 flex items-start gap-3 rounded-lg border p-3">
        <Checkbox
          id="update-categories"
          checked={payeeDialog.updateCategories}
          onCheckedChange={(checked) => {
            payeeDialog.updateCategories = checked === true;
          }} />
        <div class="grid gap-1.5 leading-none">
          <Label
            for="update-categories"
            class="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Also update category to "{payeeDialog.newPayeeDefaultCategoryName}"
          </Label>
          <p class="text-muted-foreground text-xs">
            Apply the new payee's default category to these transactions
          </p>
        </div>
      </div>
    {/if}

    <AlertDialog.Footer class="flex-col gap-2 sm:flex-col">
      <AlertDialog.Action onclick={confirmBulkPayeeUpdate} class="w-full">
        Yes, Update All Similar ({payeeDialog.matchCount + 1} transactions)
      </AlertDialog.Action>
      <AlertDialog.Cancel onclick={cancelBulkPayeeUpdate} class="w-full">
        No, Just This One
      </AlertDialog.Cancel>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Bulk Category Update Dialog -->
<AlertDialog.Root bind:open={categoryDialog.open}>
  <AlertDialog.Content class="max-w-2xl">
    <AlertDialog.Header>
      <AlertDialog.Title>Update Similar Transactions?</AlertDialog.Title>
      <AlertDialog.Description class="space-y-3">
        {#if categoryDialog.categoryName}
          <p>
            You're changing the category to "<strong>{categoryDialog.categoryName}</strong>". How would
            you like to apply this change?
          </p>
        {:else}
          <p>
            You're <strong>removing the category</strong> from this transaction. How would you like to
            apply this change?
          </p>
        {/if}

        {#if categoryDialog.matchCountByPayee > 0 && categoryDialog.matchCountByCategory > 0}
          <div class="space-y-2 text-sm">
            <p>
              • <strong>{categoryDialog.matchCountByPayee}</strong> other transaction{categoryDialog.matchCountByPayee !==
              1
                ? 's'
                : ''} with the same payee "<strong>{categoryDialog.originalPayeeName}</strong>"
            </p>
            <p>
              • <strong>{categoryDialog.matchCountByCategory}</strong> other transaction{categoryDialog.matchCountByCategory !==
              1
                ? 's'
                : ''} with the same previous category
            </p>
          </div>
        {:else if categoryDialog.matchCountByPayee > 0}
          <p class="text-sm">
            Found <strong>{categoryDialog.matchCountByPayee}</strong> other transaction{categoryDialog.matchCountByPayee !==
            1
              ? 's'
              : ''} with the same payee "<strong>{categoryDialog.originalPayeeName}</strong>".
          </p>
        {:else if categoryDialog.matchCountByCategory > 0}
          <p class="text-sm">
            Found <strong>{categoryDialog.matchCountByCategory}</strong> other transaction{categoryDialog.matchCountByCategory !==
            1
              ? 's'
              : ''} with the same previous category.
          </p>
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex-col gap-2 sm:flex-col">
      {#if categoryDialog.matchCountByPayee > 0 && categoryDialog.matchCountByCategory > 0}
        <AlertDialog.Action onclick={confirmBulkCategoryUpdateByPayee} class="w-full">
          Update All Same Payee ({categoryDialog.matchCountByPayee + 1} transactions)
        </AlertDialog.Action>
        <AlertDialog.Action
          onclick={confirmBulkCategoryUpdateByCategory}
          class="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full">
          Update All Same Category ({categoryDialog.matchCountByCategory + 1} transactions)
        </AlertDialog.Action>
      {:else if categoryDialog.matchCountByPayee > 0}
        <AlertDialog.Action onclick={confirmBulkCategoryUpdateByPayee} class="w-full">
          Update All Same Payee ({categoryDialog.matchCountByPayee + 1} transactions)
        </AlertDialog.Action>
      {:else if categoryDialog.matchCountByCategory > 0}
        <AlertDialog.Action onclick={confirmBulkCategoryUpdateByCategory} class="w-full">
          Update All Same Category ({categoryDialog.matchCountByCategory + 1} transactions)
        </AlertDialog.Action>
      {/if}
      <AlertDialog.Action
        onclick={confirmBulkCategoryUpdateJustOne}
        class="bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full">
        Just This One
      </AlertDialog.Action>
      <AlertDialog.Cancel onclick={cancelBulkCategoryUpdate} class="w-full">
        Cancel
      </AlertDialog.Cancel>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
