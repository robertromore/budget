<script lang="ts">
	import FileUploadDropzone from '$lib/components/import/file-upload-dropzone.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import type { Account } from '$core/schema/accounts';
	import Settings from '@lucide/svelte/icons/settings';

	let {
		accounts,
		selectedAccountId = $bindable(''),
		isProcessing,
		onFileSelected,
		onFileRejected,
	}: {
		accounts: Account[];
		selectedAccountId: string;
		isProcessing: boolean;
		onFileSelected: (file: File) => void;
		onFileRejected: (error: string) => void;
	} = $props();
</script>

<div class="space-y-6">
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-3xl font-bold">Import Financial Data</h1>
			<p class="text-muted-foreground mt-2">
				Upload your financial data from CSV, Excel (.xlsx, .xls), QIF, OFX/QFX, IIF, or QBO files
			</p>
		</div>
		<Button variant="outline" size="sm" href="/settings/import-profiles">
			<Settings class="mr-2 h-4 w-4" />
			Manage Profiles
		</Button>
	</div>

	<!-- Account Selection -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Select Account</Card.Title>
			<Card.Description>Choose the account to import transactions into</Card.Description>
		</Card.Header>
		<Card.Content>
			<Select.Root type="single" bind:value={selectedAccountId}>
				<Select.Trigger class="w-full">
					<span class="truncate">
						{#if selectedAccountId}
							{accounts.find((a: Account) => a.id.toString() === selectedAccountId)?.name ||
								'Choose an account...'}
						{:else}
							Choose an account...
						{/if}
					</span>
				</Select.Trigger>
				<Select.Content>
					{#each accounts as account}
						<Select.Item value={account.id.toString()}>
							{account.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</Card.Content>
	</Card.Root>

	<!-- File Upload -->
	<FileUploadDropzone
		acceptedFormats={['.csv', '.txt', '.xlsx', '.xls', '.qif', '.ofx', '.qfx', '.iif', '.qbo']}
		maxFileSize={10 * 1024 * 1024}
		onFileSelected={onFileSelected}
		onFileRejected={onFileRejected}
		showPreview={true} />

	{#if isProcessing}
		<div class="py-8 text-center">
			<div class="border-primary inline-block h-8 w-8 animate-spin rounded-full border-b-2">
			</div>
			<p class="text-muted-foreground mt-4 text-sm">Processing file...</p>
		</div>
	{/if}
</div>
