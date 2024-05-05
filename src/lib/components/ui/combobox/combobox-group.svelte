<script lang="ts">
	import { Combobox as ComboboxPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	type $$Props = ComboboxPrimitive.GroupProps;

	let className: string | undefined | null = undefined;
	export { className as class };
</script>

<ComboboxPrimitive.Group
	class={cn(
		"overflow-hidden p-1 text-foreground :text-muted-foreground",
		className
	)}
	{...$$restProps}
>
	<slot />
</ComboboxPrimitive.Group>
