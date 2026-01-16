<script lang="ts">
import * as Card from '$lib/components/ui/card';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { toast } from '$lib/utils/toast-interceptor';
import { trpc } from '$lib/trpc/client';
import { useQueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import type { Account } from '$lib/schema';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import Archive from '@lucide/svelte/icons/archive';
import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
import Trash2 from '@lucide/svelte/icons/trash-2';

interface Props {
	account: Account;
}

let { account }: Props = $props();

const queryClient = useQueryClient();

// Dialog states
let closeAccountDialog = $state({ open: false, isClosing: false });
let reopenAccountDialog = $state({ open: false, isReopening: false });
let deleteAccountDialog = $state({
	open: false,
	isDeleting: false,
	confirmationText: ''
});

// Is account closed?
const isClosed = $derived(account.closed === true);

// Close account
async function confirmCloseAccount() {
	closeAccountDialog.isClosing = true;
	try {
		await trpc().accountRoutes.closeAccount.mutate({
			accountId: account.id
		});

		toast.success('Account closed', {
			description: 'The account has been hidden from views but data is preserved.'
		});
		closeAccountDialog.open = false;

		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
	} catch (error) {
		console.error('Failed to close account:', error);
		toast.error('Failed to close account');
	} finally {
		closeAccountDialog.isClosing = false;
	}
}

// Reopen account
async function confirmReopenAccount() {
	reopenAccountDialog.isReopening = true;
	try {
		await trpc().accountRoutes.reopenAccount.mutate({
			accountId: account.id
		});

		toast.success('Account reopened', {
			description: 'The account is now visible again.'
		});
		reopenAccountDialog.open = false;

		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
	} catch (error) {
		console.error('Failed to reopen account:', error);
		toast.error('Failed to reopen account');
	} finally {
		reopenAccountDialog.isReopening = false;
	}
}

// Delete account permanently
async function confirmDeleteAccount() {
	if (deleteAccountDialog.confirmationText !== account.name) {
		toast.error('Account name does not match');
		return;
	}

	deleteAccountDialog.isDeleting = true;
	try {
		await trpc().accountRoutes.permanentlyDeleteAccount.mutate({
			accountId: account.id
		});

		toast.success('Account deleted permanently');

		// Navigate away since account no longer exists
		await goto('/accounts');
	} catch (error) {
		console.error('Failed to delete account:', error);
		toast.error('Failed to delete account');
	} finally {
		deleteAccountDialog.isDeleting = false;
	}
}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Danger Zone</h2>
		<p class="text-muted-foreground text-sm">
			Irreversible actions that affect your account and its data.
		</p>
	</div>

	<div class="space-y-4">
		<!-- Close/Reopen Account -->
		<Card.Root class="border-amber-500/50">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					{#if isClosed}
						<ArchiveRestore class="h-5 w-5" />
						Reopen Account
					{:else}
						<Archive class="h-5 w-5" />
						Close Account
					{/if}
				</Card.Title>
				<Card.Description>
					{#if isClosed}
						Reopen this account to make it visible in your account list and reports.
					{:else}
						Close this account to hide it from views. All data will be preserved.
					{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						{#if isClosed}
							<p class="text-muted-foreground text-sm">
								This account is currently closed. Reopening will restore visibility.
							</p>
						{:else}
							<p class="text-muted-foreground text-sm">
								Closing an account hides it from the sidebar and reports. You can reopen it later.
							</p>
						{/if}
					</div>
					{#if isClosed}
						<Button variant="outline" onclick={() => (reopenAccountDialog.open = true)}>
							<ArchiveRestore class="mr-2 h-4 w-4" />
							Reopen Account
						</Button>
					{:else}
						<Button variant="outline" onclick={() => (closeAccountDialog.open = true)}>
							<Archive class="mr-2 h-4 w-4" />
							Close Account
						</Button>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Delete Account Permanently -->
		<Card.Root class="border-destructive/50">
			<Card.Header>
				<Card.Title class="text-destructive flex items-center gap-2">
					<Trash2 class="h-5 w-5" />
					Delete Account Permanently
				</Card.Title>
				<Card.Description>
					Permanently delete this account and all associated data. This cannot be undone.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p class="text-muted-foreground text-sm">
							This will delete the account, all transactions, schedules, import profiles, and
							detected patterns.
						</p>
					</div>
					<Button variant="destructive" onclick={() => (deleteAccountDialog.open = true)}>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete Account
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<!-- Close Account Dialog -->
<AlertDialog.Root bind:open={closeAccountDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<Archive class="h-5 w-5" />
				Close Account?
			</AlertDialog.Title>
			<AlertDialog.Description>
				Closing "{account.name}" will hide it from the sidebar and reports. All data will be
				preserved and you can reopen it at any time.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={closeAccountDialog.isClosing}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmCloseAccount} disabled={closeAccountDialog.isClosing}>
				{closeAccountDialog.isClosing ? 'Closing...' : 'Close Account'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Reopen Account Dialog -->
<AlertDialog.Root bind:open={reopenAccountDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<ArchiveRestore class="h-5 w-5" />
				Reopen Account?
			</AlertDialog.Title>
			<AlertDialog.Description>
				Reopening "{account.name}" will make it visible again in your account list and reports.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={reopenAccountDialog.isReopening}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmReopenAccount} disabled={reopenAccountDialog.isReopening}>
				{reopenAccountDialog.isReopening ? 'Reopening...' : 'Reopen Account'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Delete Account Permanently Dialog -->
<AlertDialog.Root bind:open={deleteAccountDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="text-destructive flex items-center gap-2">
				<AlertTriangle class="h-5 w-5" />
				Delete Account Permanently?
			</AlertDialog.Title>
			<AlertDialog.Description class="space-y-3">
				<p>
					This action <strong>cannot be undone</strong>. This will permanently delete the account
					<strong>"{account.name}"</strong> and all associated:
				</p>
				<ul class="ml-4 list-disc space-y-1 text-sm">
					<li>Transactions</li>
					<li>Scheduled transactions</li>
					<li>Import profiles</li>
					<li>Detected patterns</li>
				</ul>
			</AlertDialog.Description>
		</AlertDialog.Header>
		<div class="py-4">
			<div class="space-y-2">
				<Label for="confirm-name">
					Type <strong class="text-destructive">"{account.name}"</strong> to confirm
				</Label>
				<Input
					id="confirm-name"
					bind:value={deleteAccountDialog.confirmationText}
					placeholder="Type account name here" />
			</div>
		</div>
		<AlertDialog.Footer>
			<AlertDialog.Cancel
				disabled={deleteAccountDialog.isDeleting}
				onclick={() => {
					deleteAccountDialog.confirmationText = '';
				}}>
				Cancel
			</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={confirmDeleteAccount}
				disabled={deleteAccountDialog.isDeleting ||
					deleteAccountDialog.confirmationText !== account.name}>
				{deleteAccountDialog.isDeleting ? 'Deleting...' : 'Delete Permanently'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
