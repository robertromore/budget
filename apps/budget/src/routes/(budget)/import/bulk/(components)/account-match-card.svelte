<script lang="ts">
import type { Account, AccountType, LoanSubtype } from '$core/schema/accounts';
import {
  ACCOUNT_TYPE_LABELS,
  LOAN_SUBTYPE_LABELS,
  accountTypeEnum,
  loanSubtypeEnum,
} from '$core/schema/accounts';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import { Checkbox } from '$lib/components/ui/checkbox';
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import { Separator } from '$lib/components/ui/separator';
import { formatCurrency } from '$lib/utils/formatters';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import FileText from '@lucide/svelte/icons/file-text';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Trash2 from '@lucide/svelte/icons/trash-2';
import type { BulkFile, BulkImportState } from './bulk-import-state.svelte';

type MatchConfidence = NonNullable<BulkFile['match']>['confidence'];

interface Props {
  file: BulkFile;
  accounts: Account[];
  state: BulkImportState;
}

let { file, accounts, state }: Props = $props();

const importableAccounts = $derived(accounts.filter((a) => !a.closed));

const targetKindAccessors = {
  get: () => file.targetKind,
  set: (v: string) => state.updateFile(file.id, { targetKind: v as BulkFile['targetKind'] }),
};

const existingAccountAccessors = {
  get: () => (file.existingAccountId != null ? String(file.existingAccountId) : ''),
  set: (v: string) => state.updateFile(file.id, { existingAccountId: v ? Number(v) : null }),
};

const accountTypeAccessors = {
  get: () => file.newAccountDraft.accountType,
  set: (v: string) =>
    state.updateNewAccountDraft(file.id, { accountType: v as AccountType }),
};

const loanSubtypeAccessors = {
  get: () => file.newAccountDraft.loanSubtype ?? '',
  set: (v: string) =>
    state.updateNewAccountDraft(file.id, {
      loanSubtype: v ? (v as LoanSubtype) : null,
    }),
};

function confidenceBadge(confidence: MatchConfidence) {
  switch (confidence) {
    case 'exact':
      return { label: 'Exact match', variant: 'default' as const };
    case 'high':
      return { label: 'High match', variant: 'secondary' as const };
    case 'medium':
      return { label: 'Possible match', variant: 'outline' as const };
    default:
      return { label: 'New account', variant: 'outline' as const };
  }
}
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <FileText class="text-muted-foreground h-4 w-4 shrink-0"></FileText>
          <Card.Title class="truncate text-base">{file.fileName}</Card.Title>
        </div>
        {#if file.match}
          {@const badge = confidenceBadge(file.match.confidence)}
          <div class="mt-1 flex items-center gap-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <span class="text-muted-foreground text-xs">{file.match.reason}</span>
          </div>
        {/if}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onclick={() => state.removeFile(file.id)}
        aria-label="Remove file"
      >
        <Trash2 class="h-4 w-4"></Trash2>
      </Button>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Extracted header summary -->
    {#if file.header}
      <div class="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div>
          <p class="text-muted-foreground text-xs">Institution</p>
          <p class="font-medium">{file.header.institution || '—'}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Last 4</p>
          <p class="font-medium">{file.header.accountNumberLast4 || '—'}</p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Period</p>
          <p class="font-medium">
            {file.header.statementPeriodStart || '?'} → {file.header.statementPeriodEnd || '?'}
          </p>
        </div>
        <div>
          <p class="text-muted-foreground text-xs">Transactions</p>
          <p class="font-medium">{file.transactions.length}</p>
        </div>
        {#if file.header.openingBalance != null}
          <div>
            <p class="text-muted-foreground text-xs">Opening</p>
            <p class="font-medium">{formatCurrency(file.header.openingBalance)}</p>
          </div>
        {/if}
        {#if file.header.closingBalance != null}
          <div>
            <p class="text-muted-foreground text-xs">Closing</p>
            <p class="font-medium">{formatCurrency(file.header.closingBalance)}</p>
          </div>
        {/if}
        {#if file.header.originalPrincipal != null}
          <div>
            <p class="text-muted-foreground text-xs">Orig. principal</p>
            <p class="font-medium">{formatCurrency(file.header.originalPrincipal)}</p>
          </div>
        {/if}
        {#if file.header.escrowBalance != null}
          <div>
            <p class="text-muted-foreground text-xs">Escrow</p>
            <p class="font-medium">{formatCurrency(file.header.escrowBalance)}</p>
          </div>
        {/if}
        {#if file.header.maturityDate}
          <div>
            <p class="text-muted-foreground text-xs">Maturity</p>
            <p class="font-medium">{file.header.maturityDate}</p>
          </div>
        {/if}
        {#if file.header.vestedBalance != null}
          <div>
            <p class="text-muted-foreground text-xs">Vested</p>
            <p class="font-medium">{formatCurrency(file.header.vestedBalance)}</p>
          </div>
        {/if}
        {#if file.header.statementCycleDay != null}
          <div>
            <p class="text-muted-foreground text-xs">Closes on</p>
            <p class="font-medium">Day {file.header.statementCycleDay}</p>
          </div>
        {/if}
        {#if file.header.portalUrl}
          <div class="col-span-2">
            <p class="text-muted-foreground text-xs">Portal</p>
            <p class="truncate font-medium" title={file.header.portalUrl}>{file.header.portalUrl}</p>
          </div>
        {/if}
      </div>
    {/if}

    {#if file.chunkErrors.length > 0}
      <div class="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <CircleAlert class="mt-0.5 h-4 w-4 shrink-0"></CircleAlert>
        <div>
          <p class="font-medium">Some chunks failed; transactions may be incomplete.</p>
          <ul class="mt-1 list-disc pl-4">
            {#each file.chunkErrors as err}
              <li>{err}</li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}

    {#if file.transactions.length === 0 && !file.fatalError}
      <div class="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <CircleAlert class="mt-0.5 h-4 w-4 shrink-0"></CircleAlert>
        <div class="space-y-1">
          <p class="font-medium">No transactions found in this document.</p>
          {#if file.aiSummary}
            <p>{file.aiSummary} It probably isn't a transaction statement — skip is recommended.</p>
          {:else}
            <p>This looks like a holdings or performance summary rather than a transaction statement — skip is recommended.</p>
          {/if}
          <p class="text-amber-700/80 dark:text-amber-300/80">
            You can still import to set a reconciled balance — change the dropdown below.
          </p>
        </div>
      </div>
    {/if}

    <Separator></Separator>

    <!-- Target selection -->
    <div class="space-y-3">
      <Label class="text-sm font-medium">Where should this go?</Label>
      <Select.Root type="single" bind:value={targetKindAccessors.get, targetKindAccessors.set}>
        <Select.Trigger class="w-full">
          {#if file.targetKind === 'existing'}
            Use existing account
          {:else if file.targetKind === 'new'}
            Create a new account
          {:else}
            Skip this file
          {/if}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="existing" disabled={importableAccounts.length === 0}>
            Use existing account
          </Select.Item>
          <Select.Item value="new">
            <span class="inline-flex items-center gap-1">
              <Sparkles class="h-3.5 w-3.5"></Sparkles>
              Create new account
            </span>
          </Select.Item>
          <Select.Item value="skip">Skip this file</Select.Item>
        </Select.Content>
      </Select.Root>

      {#if file.targetKind === 'existing'}
        <div class="space-y-1">
          <Label for="existing-account-{file.id}" class="text-xs">Account</Label>
          <Select.Root
            type="single"
            bind:value={existingAccountAccessors.get, existingAccountAccessors.set}
          >
            <Select.Trigger id="existing-account-{file.id}" class="w-full">
              {#if file.existingAccountId != null}
                {accounts.find((a) => a.id === file.existingAccountId)?.name || 'Choose…'}
              {:else}
                Choose an account…
              {/if}
            </Select.Trigger>
            <Select.Content>
              {#each importableAccounts as account}
                <Select.Item value={String(account.id)}>
                  {account.name}
                  {#if account.institution}
                    <span class="text-muted-foreground"> · {account.institution}</span>
                  {/if}
                  {#if account.accountNumberLast4}
                    <span class="text-muted-foreground"> · ****{account.accountNumberLast4}</span>
                  {/if}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>
      {:else if file.targetKind === 'new'}
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="space-y-1">
            <Label for="name-{file.id}" class="text-xs">Account name</Label>
            <Input
              id="name-{file.id}"
              value={file.newAccountDraft.name}
              oninput={(e) =>
                state.updateNewAccountDraft(file.id, {
                  name: (e.currentTarget as HTMLInputElement).value,
                })}
              maxlength={50}
              placeholder="e.g. Chase Sapphire"
            ></Input>
          </div>
          <div class="space-y-1">
            <Label for="type-{file.id}" class="text-xs">Type</Label>
            <Select.Root
              type="single"
              bind:value={accountTypeAccessors.get, accountTypeAccessors.set}
            >
              <Select.Trigger id="type-{file.id}" class="w-full">
                {ACCOUNT_TYPE_LABELS[file.newAccountDraft.accountType]}
              </Select.Trigger>
              <Select.Content>
                {#each accountTypeEnum as t}
                  <Select.Item value={t}>{ACCOUNT_TYPE_LABELS[t]}</Select.Item>
                {/each}
              </Select.Content>
            </Select.Root>
          </div>
          <div class="space-y-1">
            <Label for="institution-{file.id}" class="text-xs">Institution</Label>
            <Input
              id="institution-{file.id}"
              value={file.newAccountDraft.institution ?? ''}
              oninput={(e) =>
                state.updateNewAccountDraft(file.id, {
                  institution: (e.currentTarget as HTMLInputElement).value || null,
                })}
              maxlength={100}
              placeholder="e.g. Chase"
            ></Input>
          </div>
          <div class="space-y-1">
            <Label for="last4-{file.id}" class="text-xs">Account #</Label>
            <Input
              id="last4-{file.id}"
              value={file.newAccountDraft.accountNumberLast4 ?? ''}
              oninput={(e) => {
                const v = (e.currentTarget as HTMLInputElement).value.slice(0, 32);
                state.updateNewAccountDraft(file.id, {
                  accountNumberLast4: v || null,
                });
              }}
              maxlength={32}
              placeholder="1234 or full ID"
            ></Input>
          </div>
          <div class="space-y-1">
            <Label for="initial-{file.id}" class="text-xs">Initial balance</Label>
            <Input
              id="initial-{file.id}"
              type="number"
              step="0.01"
              value={file.newAccountDraft.initialBalance}
              oninput={(e) =>
                state.updateNewAccountDraft(file.id, {
                  initialBalance: Number((e.currentTarget as HTMLInputElement).value) || 0,
                })}
            ></Input>
          </div>
          <div class="space-y-1">
            <Label for="portal-{file.id}" class="text-xs">Portal URL</Label>
            <Input
              id="portal-{file.id}"
              value={file.newAccountDraft.portalUrl ?? ''}
              oninput={(e) =>
                state.updateNewAccountDraft(file.id, {
                  portalUrl: (e.currentTarget as HTMLInputElement).value.trim() || null,
                })}
              maxlength={200}
              placeholder="https://www.example.com"
            ></Input>
          </div>
          <div class="space-y-1">
            <Label for="cycle-{file.id}" class="text-xs">Closes on day</Label>
            <Input
              id="cycle-{file.id}"
              type="number"
              min={1}
              max={31}
              value={file.newAccountDraft.statementCycleDay ?? ''}
              oninput={(e) => {
                const raw = (e.currentTarget as HTMLInputElement).value;
                const num = raw === '' ? null : Number(raw);
                state.updateNewAccountDraft(file.id, {
                  statementCycleDay: num != null && Number.isInteger(num) && num >= 1 && num <= 31 ? num : null,
                });
              }}
              placeholder="1-31"
            ></Input>
          </div>
        </div>

        {#if file.newAccountDraft.accountType === 'loan'}
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div class="space-y-1">
              <Label for="loanSubtype-{file.id}" class="text-xs">Loan type</Label>
              <Select.Root
                type="single"
                bind:value={loanSubtypeAccessors.get, loanSubtypeAccessors.set}
              >
                <Select.Trigger id="loanSubtype-{file.id}" class="w-full">
                  {#if file.newAccountDraft.loanSubtype}
                    {LOAN_SUBTYPE_LABELS[file.newAccountDraft.loanSubtype]}
                  {:else}
                    Select…
                  {/if}
                </Select.Trigger>
                <Select.Content>
                  {#each loanSubtypeEnum as t}
                    <Select.Item value={t}>{LOAN_SUBTYPE_LABELS[t]}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
            <div class="space-y-1">
              <Label for="maturity-{file.id}" class="text-xs">Maturity date</Label>
              <Input
                id="maturity-{file.id}"
                type="date"
                value={file.newAccountDraft.maturityDate ?? ''}
                oninput={(e) =>
                  state.updateNewAccountDraft(file.id, {
                    maturityDate: (e.currentTarget as HTMLInputElement).value || null,
                  })}
              ></Input>
            </div>
            <div class="space-y-1">
              <Label for="origPrincipal-{file.id}" class="text-xs">Original principal</Label>
              <Input
                id="origPrincipal-{file.id}"
                type="number"
                step="0.01"
                value={file.newAccountDraft.originalPrincipal ?? ''}
                oninput={(e) => {
                  const raw = (e.currentTarget as HTMLInputElement).value;
                  const num = raw === '' ? null : Number(raw);
                  state.updateNewAccountDraft(file.id, {
                    originalPrincipal: num != null && !Number.isNaN(num) ? num : null,
                  });
                }}
              ></Input>
            </div>
            <div class="space-y-1">
              <Label for="escrow-{file.id}" class="text-xs">Escrow balance</Label>
              <Input
                id="escrow-{file.id}"
                type="number"
                step="0.01"
                value={file.newAccountDraft.escrowBalance ?? ''}
                oninput={(e) => {
                  const raw = (e.currentTarget as HTMLInputElement).value;
                  const num = raw === '' ? null : Number(raw);
                  state.updateNewAccountDraft(file.id, {
                    escrowBalance: num != null && !Number.isNaN(num) ? num : null,
                  });
                }}
              ></Input>
            </div>
          </div>
        {/if}

        {#if file.newAccountDraft.accountType === 'investment' && file.newAccountDraft.vestedBalance != null}
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div class="space-y-1">
              <Label for="vested-{file.id}" class="text-xs">Vested balance</Label>
              <Input
                id="vested-{file.id}"
                type="number"
                step="0.01"
                value={file.newAccountDraft.vestedBalance ?? ''}
                oninput={(e) => {
                  const raw = (e.currentTarget as HTMLInputElement).value;
                  const num = raw === '' ? null : Number(raw);
                  state.updateNewAccountDraft(file.id, {
                    vestedBalance: num != null && !Number.isNaN(num) ? num : null,
                  });
                }}
              ></Input>
            </div>
          </div>
        {/if}
      {/if}
    </div>

    {#if file.targetKind !== 'skip' && file.header?.closingBalance != null && file.header?.statementPeriodEnd}
      <Separator></Separator>
      <div class="flex items-start gap-2">
        <Checkbox
          id="reconcile-{file.id}"
          checked={file.applyReconciledBalance}
          onCheckedChange={(v) =>
            state.updateFile(file.id, { applyReconciledBalance: Boolean(v) })}
        ></Checkbox>
        <div class="-mt-0.5 space-y-0.5">
          <Label for="reconcile-{file.id}" class="text-sm font-medium">
            Reconcile to {formatCurrency(file.header.closingBalance)}
          </Label>
          <p class="text-muted-foreground text-xs">
            Sets the account's reconciled checkpoint to the statement closing balance dated
            {file.header.statementPeriodEnd}.
          </p>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
