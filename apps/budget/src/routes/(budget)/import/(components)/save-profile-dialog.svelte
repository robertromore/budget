<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { ColumnMapping } from '$core/types/import';
	import type { ImportProfile } from '$core/schema/import-profiles';
	import { trpc } from '$lib/trpc/client';
	import { toast } from '$lib/utils/toast-interceptor';

	let {
		open = $bindable(false),
		columnMapping,
		csvHeaders,
		accountId,
		accountName,
		matchedProfile,
		selectedFile,
		onSaved,
	}: {
		open: boolean;
		columnMapping: ColumnMapping | null;
		csvHeaders: string[];
		accountId: number | null;
		accountName: string | undefined;
		matchedProfile: ImportProfile | null;
		selectedFile: File | null;
		onSaved: () => void;
	} = $props();

	let profileName = $state('');
	let saveAsAccountDefault = $state(false);
	let saveFilenamePattern = $state(false);
	let filenamePattern = $state('');
	let isSaving = $state(false);

	function resetState() {
		profileName = selectedFile
			? selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
			: 'New Import Profile';
		filenamePattern = selectedFile
			? selectedFile.name.replace(/\d{4}[-_]?\d{2}[-_]?\d{2}/g, '*').replace(/\d+/g, '*')
			: '';
		saveAsAccountDefault = false;
		saveFilenamePattern = false;
		isSaving = false;
	}

	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (isOpen) resetState();
	}

	async function saveImportProfile() {
		if (!columnMapping || !profileName.trim()) return;

		isSaving = true;

		try {
			// Generate column signature from headers
			let columnSignature: string | null = null;
			if (csvHeaders.length > 0) {
				const result = await trpc().importProfileRoutes.generateSignature.query({
					headers: csvHeaders,
				});
				columnSignature = result.signature;
			}

			await trpc().importProfileRoutes.create.mutate({
				name: profileName.trim(),
				columnSignature,
				filenamePattern: saveFilenamePattern ? filenamePattern.trim() || null : null,
				accountId: saveAsAccountDefault && accountId ? accountId : null,
				isAccountDefault: saveAsAccountDefault,
				mapping: columnMapping,
			});

			toast.success('Import profile saved', {
				description: `"${profileName}" will be used for future imports with matching columns.`,
			});

			open = false;
			onSaved();
		} catch (err) {
			console.error('Failed to save import profile:', err);
			toast.error('Failed to save import profile');
		} finally {
			isSaving = false;
		}
	}

	function closeDialog() {
		open = false;
	}
</script>

<AlertDialog.Root {open} onOpenChange={handleOpenChange}>
	<AlertDialog.Content class="max-w-md">
		<AlertDialog.Header>
			<AlertDialog.Title>Save Import Profile</AlertDialog.Title>
			<AlertDialog.Description>
				Create a profile to automatically use this column mapping for future imports.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="profile-name">Profile Name</Label>
				<Input
					id="profile-name"
					bind:value={profileName}
					placeholder="e.g., Chase Credit Card" />
			</div>

			<div class="space-y-3">
				<div class="flex items-start gap-2">
					<Checkbox
						id="save-filename-pattern"
						checked={saveFilenamePattern}
						onCheckedChange={(checked) => (saveFilenamePattern = !!checked)} />
					<div class="grid gap-1.5 leading-none">
						<Label for="save-filename-pattern" class="text-sm font-medium">
							Match by filename pattern
						</Label>
						<p class="text-muted-foreground text-xs">Auto-match files with similar names</p>
					</div>
				</div>
				{#if saveFilenamePattern}
					<Input
						bind:value={filenamePattern}
						placeholder="e.g., chase_*.csv"
						class="ml-6" />
				{/if}
			</div>

			{#if accountId}
				<div class="flex items-start gap-2">
					<Checkbox
						id="save-account-default"
						checked={saveAsAccountDefault}
						onCheckedChange={(checked) => (saveAsAccountDefault = !!checked)} />
					<div class="grid gap-1.5 leading-none">
						<Label for="save-account-default" class="text-sm font-medium">
							Set as default for this account
						</Label>
						<p class="text-muted-foreground text-xs">
							Use this profile when importing to {accountName}
						</p>
					</div>
				</div>
			{/if}
		</div>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={closeDialog}>Cancel</AlertDialog.Cancel>
			<Button onclick={saveImportProfile} disabled={isSaving || !profileName.trim()}>
				{#if isSaving}
					Saving...
				{:else}
					Save Profile
				{/if}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
