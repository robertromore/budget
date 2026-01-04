<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Popover from '$lib/components/ui/popover';
	import { RangeCalendar } from '$lib/components/ui/range-calendar';
	import { timePeriodFilter, type TimePeriodPreset } from '$lib/states/ui/time-period-filter.svelte';
	import {
		getGroupedPresetOptions,
		formatPeriodLabel,
		type PeriodPresetGroup
	} from '$lib/utils/time-period';
	import { getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	interface Props {
		chartId: string;
		/** Limit which preset groups are available */
		allowedGroups?: PeriodPresetGroup[];
		/** Whether to show the custom range picker */
		showCustomRange?: boolean;
		class?: string;
	}

	let {
		chartId,
		allowedGroups,
		showCustomRange = true,
		class: className = ''
	}: Props = $props();

	const groupedOptions = $derived(getGroupedPresetOptions(allowedGroups));

	// Check if this chart has an override - direct SvelteMap access for proper reactivity
	const hasOverride = $derived(timePeriodFilter.chartOverrides.has(chartId));
	const effectivePeriod = $derived(
		timePeriodFilter.chartOverrides.get(chartId) ?? timePeriodFilter.globalPeriod
	);

	// State for dropdown and custom range
	let dropdownOpen = $state(false);
	let customRangeOpen = $state(false);
	let customRange = $state<{ start: DateValue; end: DateValue } | undefined>(undefined);

	function handlePresetSelect(preset: TimePeriodPreset) {
		if (preset === 'custom') {
			customRangeOpen = true;
		} else {
			timePeriodFilter.setChartOverride(chartId, preset);
		}
		dropdownOpen = false;
	}

	function handleCustomRangeApply() {
		if (customRange?.start && customRange?.end) {
			const tz = getLocalTimeZone();
			timePeriodFilter.setChartCustomRange(
				chartId,
				customRange.start.toDate(tz),
				customRange.end.toDate(tz)
			);
			customRangeOpen = false;
			customRange = undefined;
		}
	}

	function handleClearOverride() {
		timePeriodFilter.clearChartOverride(chartId);
		dropdownOpen = false;
	}
</script>

<!-- Wrap in Popover.Root so the calendar has an anchor -->
<Popover.Root bind:open={customRangeOpen}>
	<!-- Use a span as the trigger anchor - we control open state programmatically -->
	<Popover.Trigger>
		{#snippet child({ props })}
			<span {...props} class="inline-flex" onclick={(e) => e.preventDefault()}>
				{#if hasOverride}
					<!-- Show badge when chart has an override -->
					<span class="inline-flex items-center gap-1 {className}">
						<DropdownMenu.Root bind:open={dropdownOpen}>
							<DropdownMenu.Trigger>
								{#snippet child({ props: triggerProps })}
									<Button variant="default" size="sm" class="gap-1" {...triggerProps}>
										<Calendar class="h-4 w-4" />
										<span class="max-w-32 truncate">{formatPeriodLabel(effectivePeriod)}</span>
										<ChevronDown class="h-3 w-3" />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>

							<DropdownMenu.Content align="end" class="w-48">
								<!-- Use Global option -->
								<DropdownMenu.Item onclick={handleClearOverride}>
									<RotateCcw class="mr-2 h-4 w-4" />
									Use global filter
								</DropdownMenu.Item>

								<DropdownMenu.Separator />

								<!-- Preset groups -->
								{#each Object.entries(groupedOptions) as [group, options], i}
									{#if i > 0}
										<DropdownMenu.Separator />
									{/if}
									<DropdownMenu.Group>
										{#if group !== 'Other'}
											<DropdownMenu.Label class="text-xs uppercase tracking-wide"
												>{group}</DropdownMenu.Label
											>
										{/if}
										{#each options as option}
											<DropdownMenu.Item onclick={() => handlePresetSelect(option.value)}>
												{#if effectivePeriod.preset === option.value}
													<Check class="mr-2 h-4 w-4" />
												{:else}
													<span class="mr-2 h-4 w-4"></span>
												{/if}
												{option.label}
											</DropdownMenu.Item>
										{/each}
									</DropdownMenu.Group>
								{/each}

								<!-- Custom Range -->
								{#if showCustomRange}
									<DropdownMenu.Separator />
									<DropdownMenu.Item onclick={() => handlePresetSelect('custom')}>
										<Calendar class="mr-2 h-4 w-4" />
										Custom range...
									</DropdownMenu.Item>
								{/if}
							</DropdownMenu.Content>
						</DropdownMenu.Root>

						<!-- Clear button -->
						<Button variant="ghost" size="icon" class="h-7 w-7" onclick={handleClearOverride}>
							<X class="h-4 w-4" />
							<span class="sr-only">Clear chart filter</span>
						</Button>
					</span>
				{:else}
					<!-- Show current global filter with dropdown to change -->
					<DropdownMenu.Root bind:open={dropdownOpen}>
						<DropdownMenu.Trigger>
							{#snippet child({ props: triggerProps })}
								<Button variant="ghost" size="sm" class="gap-1 {className}" {...triggerProps}>
									<Calendar class="h-4 w-4" />
									<span class="max-w-32 truncate">{formatPeriodLabel(effectivePeriod)}</span>
									<ChevronDown class="h-3 w-3" />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>

						<DropdownMenu.Content align="end" class="w-48">
							<!-- Preset groups -->
							{#each Object.entries(groupedOptions) as [group, options], i}
								{#if i > 0}
									<DropdownMenu.Separator />
								{/if}
								<DropdownMenu.Group>
									{#if group !== 'Other'}
										<DropdownMenu.Label class="text-xs uppercase tracking-wide"
											>{group}</DropdownMenu.Label
										>
									{/if}
									{#each options as option}
										<DropdownMenu.Item onclick={() => handlePresetSelect(option.value)}>
											{#if effectivePeriod.preset === option.value}
												<Check class="mr-2 h-4 w-4" />
											{:else}
												<span class="mr-2 h-4 w-4"></span>
											{/if}
											{option.label}
										</DropdownMenu.Item>
									{/each}
								</DropdownMenu.Group>
							{/each}

							<!-- Custom Range -->
							{#if showCustomRange}
								<DropdownMenu.Separator />
								<DropdownMenu.Item onclick={() => handlePresetSelect('custom')}>
									{#if effectivePeriod.preset === 'custom'}
										<Check class="mr-2 h-4 w-4" />
									{:else}
										<span class="mr-2 h-4 w-4"></span>
									{/if}
									Custom range...
								</DropdownMenu.Item>
							{/if}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</span>
		{/snippet}
	</Popover.Trigger>

	<!-- Custom Range Calendar Content -->
	{#if showCustomRange}
		<Popover.Content class="w-auto p-0" align="end">
			<div class="p-4">
				<RangeCalendar
					bind:value={customRange}
					numberOfMonths={2}
					maxValue={today(getLocalTimeZone())}
				/>
				<div class="mt-4 flex justify-end gap-2">
					<Button variant="outline" size="sm" onclick={() => (customRangeOpen = false)}>
						Cancel
					</Button>
					<Button
						size="sm"
						onclick={handleCustomRangeApply}
						disabled={!customRange?.start || !customRange?.end}
					>
						Apply
					</Button>
				</div>
			</div>
		</Popover.Content>
	{/if}
</Popover.Root>
