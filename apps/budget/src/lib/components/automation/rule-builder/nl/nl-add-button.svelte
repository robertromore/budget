<!--
  NL Add Button

  Reusable button for adding conditions, groups, or actions.
  Can display as a simple button or a dropdown with options.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Plus from '@lucide/svelte/icons/plus';
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'condition' | 'group' | 'action' | 'custom';

	interface Props {
		/** Type of item to add (affects styling and default label) */
		variant?: ButtonVariant;
		/** Custom label (overrides variant default) */
		label?: string;
		/** Show dropdown with multiple options instead of single button */
		showDropdown?: boolean;
		/** Called when add button is clicked (for single button mode) */
		onAdd?: () => void;
		/** Dropdown content for multi-option mode */
		children?: Snippet;
	}

	let {
		variant = 'condition',
		label,
		showDropdown = false,
		onAdd,
		children,
	}: Props = $props();

	// Default labels by variant
	const defaultLabels: Record<ButtonVariant, string> = {
		condition: 'Add condition',
		group: 'Add group',
		action: 'Add action',
		custom: 'Add',
	};

	const displayLabel = $derived(label ?? defaultLabels[variant]);

	// Variant-specific styles
	const variantStyles: Record<ButtonVariant, string> = {
		condition: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
		group: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50',
		action: 'text-orange-600 hover:text-orange-700 hover:bg-orange-50',
		custom: '',
	};

	const buttonClass = $derived(variantStyles[variant]);
</script>

{#if showDropdown && children}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class="inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 {buttonClass}"
		>
			<Plus class="h-3.5 w-3.5" />
			{displayLabel}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start">
			{@render children()}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{:else}
	<Button
		variant="ghost"
		size="sm"
		class="h-7 gap-1 px-2 text-xs {buttonClass}"
		onclick={onAdd}
	>
		<Plus class="h-3.5 w-3.5" />
		{displayLabel}
	</Button>
{/if}
