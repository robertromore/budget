<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import ErrorBoundary from './error-boundary.svelte';

	interface Props {
		query: any;
		fallback?: import('svelte').Snippet;
		onError?: (error: Error) => void;
		children: import('svelte').Snippet;
	}

	let { query, fallback, onError, children }: Props = $props();

	const queryError = writable<Error | null>(null);

	// Watch for query errors
	$effect(() => {
		if (query?.error) {
			const error = query.error instanceof Error
				? query.error
				: new Error(query.error.message || 'Query failed');
			queryError.set(error);
			onError?.(error);
		} else {
			queryError.set(null);
		}
	});

	function retry() {
		queryError.set(null);
		if (query?.refetch) {
			query.refetch();
		}
	}

	const fallbackSnippet = {
		render: () => `
			<div class="flex flex-col items-center justify-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
				<div class="text-yellow-800 text-lg font-semibold mb-2">Failed to load data</div>
				<div class="text-yellow-700 text-sm mb-4 text-center max-w-md">
					${$queryError?.message || 'Unable to fetch the requested information'}
				</div>
				<button
					type="button"
					onclick="${retry}"
					class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
				>
					Retry
				</button>
			</div>
		`
	};
</script>

<ErrorBoundary fallback={fallback || fallbackSnippet} onError={onError}>
	{@render children()}
</ErrorBoundary>