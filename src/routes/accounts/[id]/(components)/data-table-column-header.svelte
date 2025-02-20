<script lang="ts" generics="TData, TValue">
	import EyeNone from "svelte-radix/EyeNone.svelte";
	import ArrowDown from "svelte-radix/ArrowDown.svelte";
	import ArrowUp from "svelte-radix/ArrowUp.svelte";
	import CaretSort from "svelte-radix/CaretSort.svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Column } from "@tanstack/table-core";
	import type { WithoutChildren } from "bits-ui";
	import { cn } from "$lib/utils.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import Button, { buttonVariants } from "$lib/components/ui/button/button.svelte";
  import { currentViews } from "$lib/states/current-views.svelte";

	type Props = HTMLAttributes<HTMLDivElement> & {
		column: Column<TData, TValue>;
		title: string;
	};

	let { column, class: className, title, ...restProps }: WithoutChildren<Props> = $props();

  const currentView = $derived(currentViews.get().activeView);
  const sortState = $derived(currentView.view.getSorting().find(sorter => sorter.id === column.id));
</script>

{#if !column?.getCanSort()}
	<div class={cn(buttonVariants({ variant: "ghost", size: "sm" }), className)} {...restProps}>
		{title}
	</div>
{:else}
	<div class={cn("flex items-center", className)} {...restProps}>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="sm"
						class="data-[state=open]:bg-accent -ml-3 h-8"
					>
						<span>
							{title}
						</span>
						{#if sortState && sortState.desc}
							<ArrowDown class="ml-2 size-4" />
						{:else if sortState && !sortState.desc}
							<ArrowUp class="ml-2 size-4" />
						{:else}
							<CaretSort class="ml-2 size-4" />
						{/if}
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start">
				<DropdownMenu.Item onclick={() => currentView.updateTableSorter(column.id, false)}>
					<ArrowUp class="text-muted-foreground/70 mr-2 size-3.5" />
					Asc
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => currentView.updateTableSorter(column.id, true)}>
					<ArrowDown class="text-muted-foreground/70 mr-2 size-3.5" />
					Desc
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={() => column.toggleVisibility(false)}>
					<EyeNone class="text-muted-foreground/70 mr-2 size-3.5" />
					Hide
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
{/if}
