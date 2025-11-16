<script lang="ts">
import {onMount} from 'svelte';
import {writable} from 'svelte/store';

interface Props {
  fallback?: import('svelte').Snippet;
  onError?: (error: Error, errorInfo: any) => void;
  children: import('svelte').Snippet;
}

let {fallback, onError, children}: Props = $props();

const error = writable<Error | null>(null);
const hasError = $derived($error !== null);

onMount(() => {
  const handleError = (event: ErrorEvent) => {
    const err = event.error || new Error(event.message);
    error.set(err);
    onError?.(err, {componentStack: event.filename});
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    error.set(err);
    onError?.(err, {type: 'promise'});
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
    <div
      class="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8">
      <div class="mb-2 text-lg font-semibold text-red-600">Something went wrong</div>
      <div class="mb-4 max-w-md text-center text-sm text-red-500">
        {$error?.message || 'An unexpected error occurred'}
      </div>
      <button
        type="button"
        onclick={retry}
        class="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700">
        Try Again
      </button>
    </div>
  {/if}
{:else}
  {@render children()}
{/if}
