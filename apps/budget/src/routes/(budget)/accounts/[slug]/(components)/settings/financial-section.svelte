<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Button } from '$lib/components/ui/button';
import NumericInput from '$lib/components/input/numeric-input.svelte';
import { toast } from '$lib/utils/toast-interceptor';
import { trpc } from '$lib/trpc/client';
import { useQueryClient } from '@tanstack/svelte-query';
import type { Account } from '$core/schema';
import {
  isDebtAccount,
  isInvestmentAccount,
  investmentSubtypeEnum,
  INVESTMENT_SUBTYPE_LABELS,
  type InvestmentSubtype,
} from '$core/schema/accounts';
import { accountKeys, transactionKeys } from '$lib/query';
import * as Select from '$lib/components/ui/select';
import Info from '@lucide/svelte/icons/info';

interface Props {
  account: Account;
  onAccountUpdated?: () => void;
}

let { account, onAccountUpdated }: Props = $props();

const queryClient = useQueryClient();

const isDebt = $derived(isDebtAccount(account.accountType || 'checking'));
const isInvestment = $derived(isInvestmentAccount(account.accountType || 'checking'));

// Form state — initial values captured from prop at mount time
// svelte-ignore state_referenced_locally
let initialBalance = $state(account.initialBalance ?? 0);
// svelte-ignore state_referenced_locally
let debtLimit = $state<number | undefined>(account.debtLimit ?? undefined);
// svelte-ignore state_referenced_locally
let minimumPayment = $state<number | undefined>(account.minimumPayment ?? undefined);
// svelte-ignore state_referenced_locally
let paymentDueDay = $state<number | undefined>(account.paymentDueDay ?? undefined);
// svelte-ignore state_referenced_locally
let interestRate = $state<number | null>(account.interestRate ?? null);
// svelte-ignore state_referenced_locally
let investmentSubtype = $state<InvestmentSubtype | null>(account.investmentSubtype ?? null);
// svelte-ignore state_referenced_locally
let annualContributionLimit = $state<number | undefined>(account.annualContributionLimit ?? undefined);
// svelte-ignore state_referenced_locally
let expenseRatio = $state<number | null>(account.expenseRatio ?? null);
// svelte-ignore state_referenced_locally
let benchmarkSymbol = $state<string | null>(account.benchmarkSymbol ?? null);
// svelte-ignore state_referenced_locally
let targetBalance = $state<number | undefined>(account.targetBalance ?? undefined);

let isSaving = $state(false);

async function handleSave() {
  isSaving = true;
  try {
    await trpc().accountRoutes.save.mutate({
      id: account.id,
      initialBalance,
      debtLimit: isDebt ? (debtLimit ?? null) : null,
      minimumPayment: isDebt ? (minimumPayment ?? null) : null,
      paymentDueDay: isDebt ? (paymentDueDay ?? null) : null,
      interestRate: isDebt ? interestRate : null,
      investmentSubtype: isInvestment ? investmentSubtype : null,
      annualContributionLimit: isInvestment ? (annualContributionLimit ?? null) : null,
      expenseRatio: isInvestment ? expenseRatio : null,
      benchmarkSymbol: isInvestment ? benchmarkSymbol : null,
      // targetBalance is intentionally cleared for debt and investment accounts;
      // the field is only meaningful for cash-flow types (checking, savings, cash).
      targetBalance: (!isDebt && !isInvestment) ? (targetBalance ?? null) : null,
    });

    toast.success('Financial settings updated');

    // Invalidate account data (covers account detail + contribution summary keys)
    await queryClient.invalidateQueries({ queryKey: accountKeys.detail(account.id) });
    await queryClient.invalidateQueries({ queryKey: accountKeys.list() });
    // Invalidate transactions to recalculate running balances with new initial balance
    await queryClient.invalidateQueries({ queryKey: transactionKeys.byAccount(account.id) });
    await queryClient.invalidateQueries({ queryKey: transactionKeys.allByAccount(account.id) });

    onAccountUpdated?.();
  } catch (error) {
    console.error('Failed to update financial settings:', error);
    toast.error('Failed to update financial settings');
  } finally {
    isSaving = false;
  }
}
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-xl font-semibold">Financial Settings</h2>
    <p class="text-muted-foreground text-sm">
      Manage balance and {isDebt ? 'debt-related details' : 'financial information'} for this account.
    </p>
  </div>

  <!-- Initial Balance -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Initial Balance</Card.Title>
      <Card.Description>
        The starting balance for this account. This is used as a reference point for calculating
        running balances.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="max-w-xs space-y-2">
        <Label for="initial-balance">Initial Balance</Label>
        <NumericInput bind:value={initialBalance} buttonClass="w-full" />
      </div>
      <div class="text-muted-foreground mt-3 flex items-start gap-2 text-sm">
        <Info class="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Changing the initial balance will affect all running balance calculations for this
          account.
        </p>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Debt Account Details (Credit Cards & Loans) -->
  {#if isDebt}
    <Card.Root>
      <Card.Header>
        <Card.Title>
          {account.accountType === 'credit_card' ? 'Credit Card' : 'Loan'} Details
        </Card.Title>
        <Card.Description>
          {account.accountType === 'credit_card'
            ? 'Track your credit limit, interest rate, and payment information.'
            : 'Track your loan amount, interest rate, and payment schedule.'}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Credit Limit / Loan Amount -->
          <div class="space-y-2">
            <Label for="debt-limit">
              {account.accountType === 'credit_card' ? 'Credit Limit' : 'Loan Amount'}
            </Label>
            <NumericInput bind:value={debtLimit} buttonClass="w-full" />
            <p class="text-muted-foreground text-xs">
              {account.accountType === 'credit_card'
                ? 'Maximum credit available on this card'
                : 'Total principal amount borrowed'}
            </p>
          </div>

          <!-- Interest Rate -->
          <div class="space-y-2">
            <Label for="interest-rate">Interest Rate (APR %)</Label>
            <Input
              id="interest-rate"
              type="number"
              step="0.01"
              bind:value={interestRate}
              placeholder="0.00" />
            <p class="text-muted-foreground text-xs">Annual percentage rate</p>
          </div>

          <!-- Minimum Payment -->
          <div class="space-y-2">
            <Label for="min-payment">Minimum Payment</Label>
            <NumericInput bind:value={minimumPayment} buttonClass="w-full" />
            <p class="text-muted-foreground text-xs">Minimum monthly payment required</p>
          </div>

          <!-- Payment Due Day -->
          <div class="space-y-2">
            <Label for="due-day">Payment Due Day</Label>
            <Input
              id="due-day"
              type="number"
              min="1"
              max="31"
              bind:value={paymentDueDay}
              placeholder="e.g., 15" />
            <p class="text-muted-foreground text-xs">Day of month payment is due (1-31)</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {:else if isInvestment}
    <!-- Investment Account Details -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Investment Account Details</Card.Title>
        <Card.Description>
          Track your account type and annual contribution limit for tax-advantaged accounts.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Account Subtype -->
          <div class="space-y-2">
            <Label for="investment-subtype">Account Type</Label>
            <Select.Root
              type="single"
              value={investmentSubtype ?? ''}
              onValueChange={(v) => { investmentSubtype = (v as InvestmentSubtype) || null; }}>
              <Select.Trigger id="investment-subtype" class="w-full">
                {#if investmentSubtype}
                  {INVESTMENT_SUBTYPE_LABELS[investmentSubtype] ?? investmentSubtype}
                {:else}
                  Select account type...
                {/if}
              </Select.Trigger>
              <Select.Content>
                {#each investmentSubtypeEnum as subtype}
                  <Select.Item value={subtype}>{INVESTMENT_SUBTYPE_LABELS[subtype]}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
            <p class="text-muted-foreground text-xs">Roth IRA, 401k, brokerage, etc.</p>
          </div>

          <!-- Annual Contribution Limit -->
          <div class="space-y-2">
            <Label for="contribution-limit">Annual Contribution Limit</Label>
            <NumericInput bind:value={annualContributionLimit} buttonClass="w-full" />
            <p class="text-muted-foreground text-xs">
              IRS limit for tax-advantaged accounts (optional)
            </p>
          </div>

          <!-- Expense Ratio -->
          <div class="space-y-2">
            <Label for="expense-ratio">
              Expense Ratio (%) <span class="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="expense-ratio"
              type="number"
              step="0.001"
              min="0"
              max="5"
              bind:value={expenseRatio}
              placeholder="e.g., 0.03" />
            <p class="text-muted-foreground text-xs">Annual fund expense ratio for fee drag analysis</p>
          </div>

          <!-- Benchmark Symbol -->
          <div class="space-y-2">
            <Label for="benchmark-symbol">
              Benchmark Symbol <span class="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="benchmark-symbol"
              type="text"
              maxlength={10}
              bind:value={benchmarkSymbol}
              placeholder="e.g., SPY" />
            <p class="text-muted-foreground text-xs">Ticker symbol for performance comparison (e.g., SPY, QQQ)</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root>
      <Card.Header>
        <Card.Title>Cash Flow Settings</Card.Title>
        <Card.Description>
          Set a target buffer balance to identify idle cash above your desired reserve.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="max-w-xs space-y-2">
          <Label for="target-balance">
            Target balance <span class="text-muted-foreground">(optional)</span>
          </Label>
          <NumericInput bind:value={targetBalance} buttonClass="w-full" />
          <p class="text-muted-foreground text-xs">
            The ideal buffer to keep in this account. Any amount above this is considered idle
            cash and will appear in the Cash Flow Optimizer widget.
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Save Button -->
  <div class="flex justify-end">
    <Button onclick={handleSave} disabled={isSaving}>
      {isSaving ? 'Saving...' : 'Save Changes'}
    </Button>
  </div>
</div>
