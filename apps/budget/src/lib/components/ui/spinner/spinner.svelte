<script lang="ts">
	import { cn } from "$lib/utils";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import type { ComponentProps } from "svelte";

	type Props = ComponentProps<typeof LoaderCircleIcon>;

	let { class: className, ...restProps }: Props = $props();
</script>

<LoaderCircleIcon
	role="status"
	aria-label="Loading"
	class={cn("size-4 animate-spin", className)}
	{...restProps}
/>
