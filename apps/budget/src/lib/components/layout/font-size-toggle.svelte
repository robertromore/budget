<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { fontSize } from "$lib/stores/font-size.svelte";
	import ALargeSmall from "@lucide/svelte/icons/a-large-small";

	const current = $derived(fontSize.current);

	const sizeLabels = {
		small: "S",
		normal: "M",
		large: "L",
	};

	const tooltipLabels = {
		small: "Small text",
		normal: "Normal text",
		large: "Large text",
	};
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Button {...props} onclick={() => fontSize.cycle()} variant="ghost" size="icon" class="relative h-8 w-8">
				<ALargeSmall class="h-4 w-4" />
				<span class="bg-muted text-muted-foreground absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold">{sizeLabels[current]}</span>
				<span class="sr-only">Toggle font size (current: {current})</span>
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content>
		{tooltipLabels[current]}
	</Tooltip.Content>
</Tooltip.Root>
