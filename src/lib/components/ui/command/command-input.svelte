<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import MagnifyingGlass from "svelte-radix/MagnifyingGlass.svelte";
	import { cn } from "$lib/utils.js";
    import type { ClassArray, ClassDictionary } from "clsx";

	let {
		ref = $bindable(null),
    wrapperClass,
		class: className,
		value = $bindable(""),
		...restProps
	}: CommandPrimitive.InputProps & { wrapperClass?: string | ClassArray | ClassDictionary | null } = $props();
</script>

<div
  class={cn(
    "flex items-center border-b px-3",
    wrapperClass,
  )}
  data-command-input-wrapper=""
>
	<MagnifyingGlass class="mr-2 size-4 shrink-0 opacity-50" />
	<CommandPrimitive.Input
		class={cn(
			"placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
			className
		)}
		bind:ref
		bind:value
		{...restProps}
	/>
</div>
