<script lang="ts">
	import { cn } from "$lib/utils";
	import { Textarea } from "$lib/components/ui/textarea/index.js";
	import { getAttachmentsContext } from "./attachments-context.svelte.js";

	interface Props {
		class?: string;
		placeholder?: string;
		value?: string;
		onchange?: (event: Event) => void;
		onkeydown?: (event: KeyboardEvent) => void;
		oninput?: (event: Event) => void;
	}

	let {
		class: className,
		placeholder = "What would you like to know?",
		value = $bindable(""),
		onchange,
		onkeydown,
		oninput,
		...props
	}: Props = $props();

	let attachments = getAttachmentsContext();

	let handleKeyDown = (e: KeyboardEvent) => {
		// Call external handler first (for arrow key navigation)
		onkeydown?.(e);

		// If the external handler didn't prevent default, handle Enter
		if (e.key === "Enter" && !e.defaultPrevented) {
			// Don't submit if IME composition is in progress
			if (e.isComposing) {
				return;
			}

			if (e.shiftKey) {
				// Allow newline
				return;
			}

			// Submit on Enter (without Shift)
			e.preventDefault();
			let form = (e.currentTarget as HTMLTextAreaElement).form;
			if (form) {
				form.requestSubmit();
			}
		}
	};

	let handlePaste = (e: ClipboardEvent) => {
		let items = e.clipboardData?.items;

		if (!items) {
			return;
		}

		let files: File[] = [];

		for (let item of items) {
			if (item.kind === "file") {
				let file = item.getAsFile();
				if (file) {
					files.push(file);
				}
			}
		}

		if (files.length > 0) {
			e.preventDefault();
			attachments.add(files);
		}
	};
</script>

<Textarea
	class={cn(
		"w-full resize-none rounded-none border-none p-3 shadow-none ring-0 outline-none",
		"field-sizing-content bg-transparent dark:bg-transparent",
		"max-h-48 min-h-16",
		"focus-visible:ring-0",
		className
	)}
	onpaste={handlePaste}
	name="message"
	{onchange}
	{oninput}
	onkeydown={handleKeyDown}
	{placeholder}
	bind:value
	{...props}
/>
