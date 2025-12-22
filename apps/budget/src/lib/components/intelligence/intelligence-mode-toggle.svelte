<script lang="ts">
	import { useIntelligenceInputEnabled } from '$lib/components/intelligence-input';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Brain from '@lucide/svelte/icons/brain';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CircleOff from '@lucide/svelte/icons/circle-off';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { DisabledMode, IntelligenceMode } from './types';

	// Check if the new intelligence input mode is enabled
	// When enabled, this toggle should be hidden (overlay mode replaces inline toggles)
	const intelligenceInputEnabled = useIntelligenceInputEnabled();

	interface Props {
		mode: IntelligenceMode;
		onModeChange?: (mode: IntelligenceMode) => void;
		/** Called when an AI mode (ml/llm) is selected - use this to trigger the intelligence action */
		onAction?: (mode: IntelligenceMode) => void;
		disabled?: boolean;
		disabledModes?: DisabledMode[];
		/** Show loading spinner when action is pending */
		isPending?: boolean;
		size?: 'sm' | 'default';
		/** 'default' shows label option and chevron, 'icon' is compact icon-only for field level */
		variant?: 'default' | 'icon';
		showLabel?: boolean;
		class?: string;
		/** Whether this field has been AI-enhanced before */
		isEnhanced?: boolean;
		/** When the field was last enhanced (ISO timestamp) */
		enhancedAt?: string;
		/** Confidence score of the last enhancement (0-1) */
		enhancedConfidence?: number;
	}

	let {
		mode = 'none',
		onModeChange,
		onAction,
		disabled = false,
		disabledModes = [],
		isPending = false,
		size = 'default',
		variant = 'default',
		showLabel = false,
		class: className,
		isEnhanced = false,
		enhancedAt,
		enhancedConfidence
	}: Props = $props();

	// Format the enhanced timestamp for display
	const enhancedDateFormatted = $derived(() => {
		if (!enhancedAt) return undefined;
		try {
			return new Date(enhancedAt).toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return undefined;
		}
	});

	// Build tooltip content
	const tooltipContent = $derived(() => {
		if (isEnhanced && enhancedAt) {
			const dateStr = enhancedDateFormatted();
			const confStr = enhancedConfidence ? ` (${Math.round(enhancedConfidence * 100)}%)` : '';
			return `${currentMode.label} - Enhanced ${dateStr}${confStr}`;
		}
		return currentMode.label;
	});

	// Check if a mode is disabled
	function isModeDisabled(modeValue: IntelligenceMode): boolean {
		return disabledModes.some((dm) => dm.mode === modeValue);
	}

	// Get the reason a mode is disabled
	function getDisabledReason(modeValue: IntelligenceMode): string | undefined {
		return disabledModes.find((dm) => dm.mode === modeValue)?.reason;
	}

	const modes = [
		{ value: 'none', label: 'No Intelligence', icon: CircleOff, description: 'Manual input only' },
		{ value: 'ml', label: 'ML Intelligence', icon: Brain, description: 'Fast local predictions' },
		{
			value: 'llm',
			label: 'LLM Intelligence',
			icon: Sparkles,
			description: 'Powerful AI assistance'
		}
	] as const;

	const currentMode = $derived(modes.find((m) => m.value === mode) ?? modes[0]);

	function handleSelect(value: IntelligenceMode) {
		if (value !== mode) {
			onModeChange?.(value);
		}
		// Trigger action when selecting an AI mode (even if same mode - re-trigger)
		if (value !== 'none') {
			onAction?.(value);
		}
	}
</script>

<!-- Hide this toggle when new intelligence input mode is enabled -->
{#if !intelligenceInputEnabled.current}
	<DropdownMenu.Root>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props: tooltipProps })}
					<DropdownMenu.Trigger disabled={disabled || isPending} {...tooltipProps}>
						{#snippet child({ props })}
							<div class="relative inline-flex">
								<Button
									variant={variant === 'icon' ? 'outline' : 'ghost'}
									size={variant === 'icon' ? 'icon' : size === 'sm' ? 'sm' : 'default'}
									class="{variant === 'icon' ? '' : 'gap-1.5'} {className}"
									{...props}
								>
									{#if isPending}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else}
										<currentMode.icon class="h-4 w-4" />
									{/if}
									{#if variant !== 'icon'}
										{#if showLabel}
											<span class="text-xs">{currentMode.label}</span>
										{/if}
										<ChevronDown class="h-3 w-3 opacity-50" />
									{/if}
								</Button>
								{#if isEnhanced}
									<span
										class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-violet-500"
										title="AI Enhanced"
									></span>
								{/if}
							</div>
						{/snippet}
					</DropdownMenu.Trigger>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content side="bottom">
				<p>{tooltipContent()}</p>
			</Tooltip.Content>
		</Tooltip.Root>

		<DropdownMenu.Content align="end" class="w-52">
			<DropdownMenu.Label>Intelligence Mode</DropdownMenu.Label>
			<DropdownMenu.Separator />

			{#each modes as modeOption (modeOption.value)}
				{@const ModeIcon = modeOption.icon}
				{@const isDisabled = isModeDisabled(modeOption.value)}
				{@const disabledReason = getDisabledReason(modeOption.value)}
				<DropdownMenu.Item
					onclick={() => !isDisabled && handleSelect(modeOption.value)}
					class="gap-2"
					disabled={isDisabled}
				>
					{#if mode === modeOption.value}
						<Check class="text-primary h-4 w-4" />
					{:else}
						<div class="h-4 w-4"></div>
					{/if}
					<ModeIcon class="h-4 w-4 {isDisabled ? 'opacity-50' : ''}" />
					<div class="flex flex-col">
						<span class={isDisabled ? 'opacity-50' : ''}>{modeOption.label}</span>
						<span class="text-muted-foreground text-xs {isDisabled ? 'opacity-50' : ''}">
							{isDisabled && disabledReason ? disabledReason : modeOption.description}
						</span>
					</div>
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
