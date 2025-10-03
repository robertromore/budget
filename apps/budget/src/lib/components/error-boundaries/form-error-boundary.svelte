<script lang="ts">
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import ErrorBoundary from './error-boundary.svelte';

	interface Props {
		form?: any;
		fallback?: import('svelte').Snippet;
		onError?: (error: Error) => void;
		children: import('svelte').Snippet;
	}

	let { form, fallback, onError, children }: Props = $props();

	const formError = writable<Error | null>(null);

	// Watch for form submission errors
	$effect(() => {
		if (form?.errors?._errors?.length > 0) {
			const error = new Error(form.errors._errors.join(', '));
			formError.set(error);
			onError?.(error);
		} else if (form?.message && typeof form.message === 'object' && form.message.type === 'error') {
			const error = new Error(form.message.text || 'Form submission failed');
			formError.set(error);
			onError?.(error);
		} else {
			formError.set(null);
		}
	});

	function retry() {
		formError.set(null);
		// Clear form errors if possible
		if (form?.clear) {
			form.clear();
		}
	}

	const fallbackSnippet = {
		render: () => `
			<div class="flex flex-col items-center justify-center p-6 bg-orange-50 border border-orange-200 rounded-lg">
				<div class="text-orange-800 text-lg font-semibold mb-2">Form submission failed</div>
				<div class="text-orange-700 text-sm mb-4 text-center max-w-md">
					${$formError?.message || 'There was an error submitting the form'}
				</div>
				<button
					type="button"
					onclick="${retry}"
					class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
				>
					Try Again
				</button>
			</div>
		`
	};
</script>

<ErrorBoundary fallback={fallback || fallbackSnippet} onError={onError}>
	{@render children()}
</ErrorBoundary>