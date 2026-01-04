<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Popover from '$lib/components/ui/popover';
	import { RangeCalendar } from '$lib/components/ui/range-calendar';
	import {
		timePeriodFilter,
		type TimePeriod,
		type TimePeriodPreset
	} from '$lib/states/ui/time-period-filter.svelte';
	import {
		formatPeriodLabel,
		getGroupedPresetOptions,
		isAllTime,
		type PeriodPresetGroup
	} from '$lib/utils/time-period';
	import { CalendarDate, type DateValue } from '@internationalized/date';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		/** Current period value - if not provided, uses global filter state */
		value?: TimePeriod;
		/** Callback when period changes */
		onchange?: (period: TimePeriod) => void;
		/** Size variant */
		size?: 'sm' | 'default';
		/** Limit which preset groups are available (e.g., ['months', 'year'] for monthly charts) */
		allowedGroups?: PeriodPresetGroup[];
		/** Whether to show the custom range picker */
		showCustomRange?: boolean;
		/** Additional classes */
		class?: string;
	}

	let {
		value: valueProp,
		onchange,
		size = 'default',
		allowedGroups,
		showCustomRange = true,
		class: className = ''
	}: Props = $props();

	// Use prop value if provided, otherwise reactively track global state
	const value = $derived(valueProp ?? timePeriodFilter.globalPeriod);

	// Track dropdown and popover state
	let dropdownOpen = $state(false);
	let customRangeOpen = $state(false);

	// Track custom range selection
	let customRangeValue = $state<{ start: DateValue; end: DateValue } | undefined>(undefined);

	// Get grouped options based on allowed groups
	const groupedOptions = $derived(getGroupedPresetOptions(allowedGroups));

	function handlePresetSelect(preset: TimePeriodPreset) {
		if (onchange) {
			const range = timePeriodFilter.getDateRange({ preset, start: null, end: null });
			onchange({
				preset,
				start: range?.start ?? null,
				end: range?.end ?? null
			});
		} else {
			timePeriodFilter.setGlobalPreset(preset);
		}
		dropdownOpen = false;
	}

	function handleCustomRangeApply() {
		if (customRangeValue?.start && customRangeValue?.end) {
			const start = customRangeValue.start.toDate('UTC');
			const end = customRangeValue.end.toDate('UTC');
			// Set end to end of day
			end.setHours(23, 59, 59, 999);

			if (onchange) {
				onchange({
					preset: 'custom',
					start,
					end
				});
			} else {
				timePeriodFilter.setGlobalCustomRange(start, end);
			}
		}
		customRangeOpen = false;
		dropdownOpen = false;
	}

	function handleClear() {
		if (onchange) {
			onchange({ preset: 'all-time', start: null, end: null });
		} else {
			timePeriodFilter.clearGlobalFilter();
		}
		dropdownOpen = false;
	}

	// Initialize custom range value from current value if it's a custom range
	$effect(() => {
		if (value.preset === 'custom' && value.start && value.end) {
			customRangeValue = {
				start: new CalendarDate(
					value.start.getFullYear(),
					value.start.getMonth() + 1,
					value.start.getDate()
				),
				end: new CalendarDate(
					value.end.getFullYear(),
					value.end.getMonth() + 1,
					value.end.getDate()
				)
			};
		}
	});
</script>

<DropdownMenu.Root bind:open={dropdownOpen}>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				variant={isAllTime(value) ? 'outline' : 'default'}
				size={size}
				class="gap-2 {className}"
				{...props}
			>
				<Calendar class="h-4 w-4" />
				<span>{formatPeriodLabel(value)}</span>
				<ChevronDown class="h-4 w-4 opacity-50" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-56" align="start">
		<!-- Dynamic groups based on allowed options -->
		{#each Object.entries(groupedOptions) as [groupName, options], i}
			{#if i > 0}
				<DropdownMenu.Separator />
			{/if}
			<DropdownMenu.Group>
				{#if groupName !== 'Other'}
					<DropdownMenu.GroupHeading>{groupName}</DropdownMenu.GroupHeading>
				{/if}
				{#each options as option}
					<DropdownMenu.Item onclick={() => handlePresetSelect(option.value)}>
						<span class="flex-1">{option.label}</span>
						{#if value.preset === option.value}
							<Check class="h-4 w-4" />
						{/if}
					</DropdownMenu.Item>
				{/each}
			</DropdownMenu.Group>
		{/each}

		<!-- Custom Range -->
		{#if showCustomRange}
			<DropdownMenu.Separator />
			<Popover.Root bind:open={customRangeOpen}>
				<Popover.Trigger class="w-full">
					{#snippet child({ props })}
						<DropdownMenu.Item
							{...props}
							onSelect={(e) => {
								e.preventDefault();
								customRangeOpen = true;
							}}
						>
							<span class="flex-1">Custom range...</span>
							{#if value.preset === 'custom'}
								<Check class="h-4 w-4" />
							{/if}
						</DropdownMenu.Item>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-0" align="start" side="right" sideOffset={8}>
					<div class="p-3">
						<RangeCalendar bind:value={customRangeValue} numberOfMonths={2} />
						<div class="mt-3 flex justify-end gap-2">
							<Button variant="outline" size="sm" onclick={() => (customRangeOpen = false)}>
								Cancel
							</Button>
							<Button
								size="sm"
								disabled={!customRangeValue?.start || !customRangeValue?.end}
								onclick={handleCustomRangeApply}
							>
								Apply
							</Button>
						</div>
					</div>
				</Popover.Content>
			</Popover.Root>
		{/if}

		<!-- Clear button when not all-time -->
		{#if !isAllTime(value)}
			<DropdownMenu.Separator />
			<DropdownMenu.Item onclick={handleClear} class="text-muted-foreground">
				<X class="mr-2 h-4 w-4" />
				Clear filter
			</DropdownMenu.Item>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
