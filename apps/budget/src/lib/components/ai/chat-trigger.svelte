<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { aiChat } from "$lib/states/ui/ai-chat.svelte";
	import { Sparkles } from "@lucide/svelte/icons";
	import { cn } from "$lib/utils";

	interface Props {
		class?: string;
		variant?: "default" | "ghost" | "outline";
		size?: "default" | "sm" | "lg" | "icon";
		showLabel?: boolean;
		[key: string]: unknown;
	}

	let { class: className, variant = "ghost", size = "icon", showLabel = false, ...restProps }: Props = $props();
</script>

<Button
	{variant}
	{size}
	{...restProps}
	class={cn("relative", className)}
	onclick={() => aiChat.toggle()}
	data-help-id="ai-assistant"
	data-help-title="AI Assistant"
>
	{#if aiChat.hasMessages}
		<span class="bg-primary absolute -top-1 -right-1 flex size-2 rounded-full">
			<span class="bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-75"></span>
			<span class="bg-primary relative inline-flex size-2 rounded-full"></span>
		</span>
	{/if}
	<Sparkles class="size-4" />
	{#if showLabel}
		<span class="ml-2">AI Assistant</span>
	{/if}
</Button>
