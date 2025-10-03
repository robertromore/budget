<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';

	interface Props {
		fallback?: import('svelte').Snippet;
		onError?: (error: Error, errorInfo: any) => void;
		children: import('svelte').Snippet;
	}

	let { fallback, onError, children }: Props = $props();

	const error = writable<Error | null>(null);
	const hasError = $derived($error !== null);

	onMount(() => {
		const handleError = (event: ErrorEvent) => {
			const err = event.error || new Error(event.message);
			error.set(err);
			onError?.(err, { componentStack: event.filename });
		};

		const handleRejection = (event: PromiseRejectionEvent) => {
			const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
			error.set(err);
			onError?.(err, { type: 'promise' });
		};

		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleRejection);

		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleRejection);
		};
	});

	function retry() {
		error.set(null);
	}
</script>

{#if hasError}
	{#if fallback}
		{@render fallback()}
	{:else}
		<div class="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
			<div class="text-red-600 text-lg font-semibold mb-2">Something went wrong</div>
			<div class="text-red-500 text-sm mb-4 text-center max-w-md">
				{$error?.message || 'An unexpected error occurred'}
			</div>
			<button
				type="button"
				onclick={retry}
				class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
			>
				Try Again
			</button>
		</div>
	{/if}
{:else}
	{@render children()}
{/if}