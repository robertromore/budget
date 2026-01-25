<script lang="ts">
	import { PromptInputController, setPromptInputProvider } from "./attachments-context.svelte.js";

	interface Props {
		initialInput?: string;
		accept?: string;
		multiple?: boolean;
		children?: import("svelte").Snippet;
	}

	let { initialInput = "", accept, multiple = true, children }: Props = $props();

	// svelte-ignore state_referenced_locally
	let controller = new PromptInputController(initialInput, accept, multiple);

	setPromptInputProvider(controller);
</script>

{#if children}
	{@render children()}
{/if}
