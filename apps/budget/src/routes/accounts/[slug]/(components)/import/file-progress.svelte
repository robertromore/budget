<script lang="ts">
	import { cn } from '$lib/utils';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import Circle from '@lucide/svelte/icons/circle';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import type { ImportFile } from '$lib/types/import';

	interface Props {
		files: ImportFile[];
		currentIndex: number;
		onFileClick?: (index: number) => void;
		class?: string;
	}

	let { files, currentIndex, onFileClick, class: className }: Props = $props();

	function getStatusIcon(file: ImportFile, index: number) {
		if (file.status === 'error') {
			return { icon: AlertCircle, class: 'text-destructive' };
		}
		if (file.status === 'ready') {
			return { icon: CheckCircle, class: 'text-green-600' };
		}
		if (index === currentIndex && ['uploading', 'mapping', 'preview'].includes(file.status)) {
			return { icon: Loader2, class: 'text-primary animate-spin' };
		}
		return { icon: Circle, class: 'text-muted-foreground' };
	}
</script>

<div class={cn('space-y-2', className)}>
	<!-- Progress indicator -->
	<div class="text-muted-foreground mb-2 text-sm">
		Processing file {currentIndex + 1} of {files.length}
	</div>

	<!-- File pills -->
	<div class="flex flex-wrap items-center gap-2">
		{#each files as file, index (file.id)}
			{@const status = getStatusIcon(file, index)}
			{@const StatusIcon = status.icon}
			{@const isCurrent = index === currentIndex}
			{@const isPast = index < currentIndex || file.status === 'ready'}
			{@const canClick = isPast && onFileClick}

			<button
				type="button"
				class={cn(
					'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
					isCurrent && 'border-primary bg-primary text-primary-foreground shadow-sm',
					!isCurrent && isPast && 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400',
					!isCurrent && !isPast && 'border-muted bg-muted/30 text-muted-foreground',
					file.status === 'error' && 'border-destructive bg-destructive/10 text-destructive',
					canClick && 'cursor-pointer hover:opacity-80',
					!canClick && 'cursor-default'
				)}
				onclick={() => canClick && onFileClick?.(index)}
				disabled={!canClick}
			>
				<StatusIcon class={cn('h-3.5 w-3.5', isCurrent ? 'text-inherit' : status.class)} />
				<span class="max-w-24 truncate">{file.fileName}</span>
			</button>
		{/each}
	</div>

	<!-- Progress bar -->
	<div class="bg-muted h-1.5 w-full overflow-hidden rounded-full">
		<div
			class="bg-primary h-full transition-all duration-300"
			style:width="{((files.filter(f => f.status === 'ready').length) / files.length) * 100}%"
		></div>
	</div>
</div>
