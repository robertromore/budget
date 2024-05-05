<script lang="ts">
	import { Combobox as ComboboxPrimitive } from "bits-ui";
	import { scale } from "svelte/transition";
	import { cn, flyAndScale } from "$lib/utils.js";

	type $$Props = ComboboxPrimitive.ContentProps;

	let className: $$Props["class"] = undefined;
  export let side: $$Props["side"] = 'bottom';
	export let sideOffset: $$Props["sideOffset"] = 0;
  export let align: $$Props["align"] = 'start';
	export let inTransition: $$Props["inTransition"] = flyAndScale;
	export let inTransitionConfig: $$Props["inTransitionConfig"] = undefined;
	export let outTransition: $$Props["outTransition"] = scale;
	export let outTransitionConfig: $$Props["outTransitionConfig"] = {
		start: 0.95,
		opacity: 0,
		duration: 50,
	};
	export { className as class };
</script>

<ComboboxPrimitive.Content
	{inTransition}
	{inTransitionConfig}
	{outTransition}
	{outTransitionConfig}
  {side}
	{sideOffset}
  {align}
	class={cn(
		"z-50 bg-popover text-popover-foreground focus:outline-none max-h-[300px] overflow-y-auto overflow-x-hidden relative rounded-md border shadow-md mt-2 min-w-[8rem]",
		className
	)}
	{...$$restProps}
>
	<div class="p-1">
		<slot />
	</div>
</ComboboxPrimitive.Content>
