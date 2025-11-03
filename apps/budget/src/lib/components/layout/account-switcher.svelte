<script lang="ts">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import {AccountsState} from '$lib/states/entities/accounts.svelte';
import {goto} from '$app/navigation';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Plus from '@lucide/svelte/icons/plus';
import Settings from '@lucide/svelte/icons/settings';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';
import {page} from '$app/stores';
import {Badge} from '$lib/components/ui/badge';
import {formatAccountBalance, getBalanceColorClass, calculateDebtMetrics} from '$lib/utils/account-display';
import {isDebtAccount} from '$lib/schema/accounts';
import {currencyFormatter} from '$lib/utils/formatters';
import {Button} from '$lib/components/ui/button';

const accountsState = $derived(AccountsState.get());
const accounts = $derived(accountsState.sorted);

// Get current account from URL - check both /accounts and /unified/accounts routes
let currentAccountSlug = $derived(
	$page.url.pathname.match(/\/(?:unified\/)?accounts\/([^\/]+)/)?.[1]
);
let currentAccount = $derived(
	accounts.find((a) => a.slug === currentAccountSlug)
);

function handleAccountSelect(accountSlug: string) {
	goto(`/unified/accounts/${accountSlug}`);
}

function handleNewAccount() {
	goto('/accounts/new');
}

function handleManageAccounts() {
	goto('/accounts');
}

function getAccountIcon(account: any) {
	if (account.accountIcon) {
		const iconData = getIconByName(account.accountIcon);
		return iconData?.icon;
	}
	return CreditCard;
}
</script>

<div class="w-full px-2 py-2">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline" class="w-full h-auto py-2 justify-between">
				<div class="flex gap-3 flex-1 min-w-0">
					{#if currentAccount}
						{@const IconComponent = getAccountIcon(currentAccount)}
						{@const formattedBalance = formatAccountBalance(currentAccount)}
						<!-- Account Icon -->
						<div
							class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
							style="background-color: {currentAccount.accountColor
								? `${currentAccount.accountColor}15`
								: 'hsl(var(--muted))'}"
						>
							<IconComponent
								class="h-4 w-4"
								style={currentAccount.accountColor
									? `color: ${currentAccount.accountColor}`
									: 'color: hsl(var(--muted-foreground))'}
							/>
						</div>

						<!-- Account Info -->
						<div class="flex-1 min-w-0 text-left">
							<div class="flex items-center gap-2">
								<span class="font-medium text-sm truncate">
									{currentAccount.name}
								</span>
								{#if currentAccount.closed}
									<Badge variant="secondary" class="text-xs px-1.5 py-0">Closed</Badge>
								{/if}
							</div>
							<div class="flex items-center gap-2 mt-0.5">
								{#if currentAccount.accountType}
									<span class="text-xs text-muted-foreground capitalize">
										{currentAccount.accountType.replace('_', ' ')}
									</span>
								{/if}
								{#if currentAccount.onBudget === false}
									<Badge variant="outline" class="text-xs px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">Off Budget</Badge>
								{/if}
							</div>

							<!-- Account Details -->
							<div class="flex items-center gap-1 text-xs text-muted-foreground truncate">
								{#if currentAccount.accountNumber}
									<span class="font-mono">
										••{currentAccount.accountNumber.slice(-4)}
									</span>
								{/if}
								{#if currentAccount.institution}
									{#if currentAccount.accountNumber}
										<span>•</span>
									{/if}
									<span class="truncate">{currentAccount.institution}</span>
								{/if}
							</div>

							<!-- Account Balance -->
							<div class="text-xs font-medium text-left mt-1">
								{#if currentAccount.accountType === 'credit_card' && currentAccount.debtLimit}
									{@const metrics = calculateDebtMetrics(currentAccount)}
									{#if metrics}
										<div class="flex flex-col gap-0.5">
											<div class="{getBalanceColorClass(formattedBalance.color)}">
												{currencyFormatter.format(metrics.availableCredit ?? 0)} <span class="text-[10px] opacity-70">available</span>
											</div>
											<div class="text-[10px] text-muted-foreground">
												{currencyFormatter.format(Math.abs(currentAccount.balance || 0))} / {currencyFormatter.format(currentAccount.debtLimit)}
											</div>
										</div>
									{:else}
										<div class="{getBalanceColorClass(formattedBalance.color)}">
											{currencyFormatter.format(formattedBalance.displayAmount)}
											<span class="text-[10px] ml-1 opacity-70">{formattedBalance.label}</span>
										</div>
									{/if}
								{:else}
									<div class="{getBalanceColorClass(formattedBalance.color)}">
										{currencyFormatter.format(formattedBalance.displayAmount)}
										{#if currentAccount.accountType && isDebtAccount(currentAccount.accountType)}
											<span class="text-[10px] ml-1 opacity-70">{formattedBalance.label}</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<CreditCard class="h-4 w-4 shrink-0" />
						<span class="truncate font-medium">Select Account</span>
					{/if}
				</div>
				<ChevronDown class="h-4 w-4 ml-2 shrink-0" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content class="w-[320px]">
			<DropdownMenu.Label>Accounts</DropdownMenu.Label>
			{#each accounts as account (account.id)}
				{@const IconComponent = getAccountIcon(account)}
				{@const formattedBalance = formatAccountBalance(account)}
				<DropdownMenu.Item class="py-3 cursor-pointer" onclick={() => handleAccountSelect(account.slug)}>
					<div class="flex gap-3 w-full min-w-0">
						<!-- Account Icon -->
						<div
							class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
							style="background-color: {account.accountColor
								? `${account.accountColor}15`
								: 'hsl(var(--muted))'}"
						>
							<IconComponent
								class="h-4 w-4"
								style={account.accountColor
									? `color: ${account.accountColor}`
									: 'color: hsl(var(--muted-foreground))'}
							/>
						</div>

						<!-- Account Info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="font-medium text-sm truncate" class:font-bold={account.id === currentAccount?.id}>
											{account.name}
										</span>
										{#if account.closed}
											<Badge variant="secondary" class="text-xs px-1.5 py-0">Closed</Badge>
										{/if}
									</div>
									<div class="flex items-center gap-2 mt-0.5">
										{#if account.accountType}
											<span class="text-xs text-muted-foreground capitalize">
												{account.accountType.replace('_', ' ')}
											</span>
										{/if}
										{#if account.onBudget === false}
											<Badge variant="outline" class="text-xs px-1.5 py-0 border-muted-foreground/30 text-muted-foreground">Off Budget</Badge>
										{/if}
									</div>
								</div>
							</div>

							<!-- Account Details -->
							<div class="flex items-center gap-1 text-xs text-muted-foreground truncate">
								{#if account.accountNumber}
									<span class="font-mono">
										••{account.accountNumber.slice(-4)}
									</span>
								{/if}
								{#if account.institution}
									{#if account.accountNumber}
										<span>•</span>
									{/if}
									<span class="truncate">{account.institution}</span>
								{/if}
							</div>

							<!-- Account Balance -->
							<div class="text-xs font-medium text-right mt-1">
								{#if account.accountType === 'credit_card' && account.debtLimit}
									{@const metrics = calculateDebtMetrics(account)}
									{#if metrics}
										<div class="flex flex-col gap-0.5">
											<div class="{getBalanceColorClass(formattedBalance.color)}">
												{currencyFormatter.format(metrics.availableCredit ?? 0)} <span class="text-[10px] opacity-70">available</span>
											</div>
											<div class="text-[10px] text-muted-foreground">
												{currencyFormatter.format(Math.abs(account.balance || 0))} / {currencyFormatter.format(account.debtLimit)}
											</div>
										</div>
									{:else}
										<div class="{getBalanceColorClass(formattedBalance.color)}">
											{currencyFormatter.format(formattedBalance.displayAmount)}
											<span class="text-[10px] ml-1 opacity-70">{formattedBalance.label}</span>
										</div>
									{/if}
								{:else}
									<div class="{getBalanceColorClass(formattedBalance.color)}">
										{currencyFormatter.format(formattedBalance.displayAmount)}
										{#if account.accountType && isDebtAccount(account.accountType)}
											<span class="text-[10px] ml-1 opacity-70">{formattedBalance.label}</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</DropdownMenu.Item>
			{/each}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={handleNewAccount} class="cursor-pointer">
				<Plus class="h-4 w-4 mr-2" />
				<span>New Account</span>
			</DropdownMenu.Item>
			<DropdownMenu.Item onclick={handleManageAccounts} class="cursor-pointer">
				<Settings class="h-4 w-4 mr-2" />
				<span>Manage Accounts</span>
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
