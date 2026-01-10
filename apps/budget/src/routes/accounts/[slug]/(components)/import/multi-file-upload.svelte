<script lang="ts">
	import FileUploadDropzone from '$lib/components/import/file-upload-dropzone.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { formatFileSize } from '$lib/utils/formatters';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import FileText from '@lucide/svelte/icons/file-text';
	import X from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';
	import type { MultiFileImportStateManager } from './multi-file-import-state.svelte';
	import { getFileTypeName } from './multi-file-import-state.svelte';

	interface Props {
		importState: MultiFileImportStateManager;
		onContinue: () => void;
		class?: string;
	}

	let { importState, onContinue, class: className }: Props = $props();

	function handleFilesSelected(files: File[]) {
		const result = importState.addFiles(files);

		if (result.rejected.length > 0) {
			toast.error(`${result.rejected.length} file(s) rejected`, {
				description: result.rejected.join('\n')
			});
		}

		if (result.added.length > 0) {
			toast.success(`${result.added.length} file(s) added`);
		}
	}

	function handleRemoveFile(id: string) {
		importState.removeFile(id);
	}

	const totalSize = $derived(
		importState.files.reduce((sum, f) => sum + f.file.size, 0)
	);

	const canContinue = $derived(importState.files.length > 0);
</script>

<div class={cn('space-y-6', className)}>
	<!-- Dropzone -->
	<FileUploadDropzone
		acceptedFormats={['.csv', '.txt', '.xlsx', '.xls', '.qif', '.ofx', '.qfx', '.iif', '.qbo']}
		maxFileSize={10 * 1024 * 1024}
		allowMultiple={true}
		onFilesSelected={handleFilesSelected}
		showPreview={false}
	/>

	<!-- Selected Files List -->
	{#if importState.files.length > 0}
		<Card.Root>
			<Card.Header class="pb-3">
				<div class="flex items-center justify-between">
					<Card.Title class="text-base">
						Selected Files ({importState.files.length})
					</Card.Title>
					{#if importState.enforceFileType}
						<Badge variant="secondary">
							{getFileTypeName(importState.enforceFileType)}
						</Badge>
					{/if}
				</div>
				<Card.Description>
					All files must be the same format. Total size: {formatFileSize(totalSize)}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					{#each importState.files as file (file.id)}
						<div
							class={cn(
								'flex items-center justify-between rounded-lg border p-3 transition-colors',
								file.status === 'error' && 'border-destructive bg-destructive/5',
								file.status === 'ready' && 'border-green-500 bg-green-50 dark:bg-green-950/20'
							)}
						>
							<div class="flex items-center gap-3">
								<div
									class={cn(
										'flex h-10 w-10 items-center justify-center rounded-lg',
										file.status === 'error'
											? 'bg-destructive/10'
											: file.status === 'ready'
												? 'bg-green-100 dark:bg-green-900/30'
												: 'bg-primary/10'
									)}
								>
									{#if file.status === 'error'}
										<AlertCircle class="text-destructive h-5 w-5" />
									{:else if file.status === 'ready'}
										<CheckCircle class="h-5 w-5 text-green-600" />
									{:else}
										<FileText class="text-primary h-5 w-5" />
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium">{file.fileName}</p>
									<div class="text-muted-foreground flex items-center gap-2 text-sm">
										<span>{formatFileSize(file.file.size)}</span>
										{#if file.status === 'error' && file.error}
											<span class="text-destructive">- {file.error}</span>
										{/if}
									</div>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8 shrink-0"
								onclick={() => handleRemoveFile(file.id)}
							>
								<X class="h-4 w-4" />
								<span class="sr-only">Remove file</span>
							</Button>
						</div>
					{/each}
				</div>

				{#if importState.files.length > 1}
					<div class="mt-4 flex justify-end">
						<Button variant="ghost" size="sm" onclick={() => importState.reset()}>
							Clear All
						</Button>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Continue Button -->
		<div class="flex justify-end">
			<Button onclick={onContinue} disabled={!canContinue} size="lg">
				Continue with {importState.files.length} file{importState.files.length > 1 ? 's' : ''}
			</Button>
		</div>
	{/if}
</div>
