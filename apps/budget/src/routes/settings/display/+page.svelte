<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Switch } from '$lib/components/ui/switch';
	import {
	  displayPreferences,
	  type DateFormat,
	  type NumberFormat,
	  type TableDisplayMode
	} from '$lib/stores/display-preferences.svelte';
	import {
	  headerActionsMode,
	  type HeaderActionsDisplay,
	  type HeaderActionsMode,
	  type HeaderTabsDisplay,
	  type HeaderTabsMode
	} from '$lib/stores/header-actions.svelte';

	// Reactive state for current values
	const currentDateFormat = $derived(displayPreferences.dateFormat);
	const currentNumberFormat = $derived(displayPreferences.numberFormat);
	const currentShowCents = $derived(displayPreferences.showCents);
	const currentTableDisplayMode = $derived(displayPreferences.tableDisplayMode);
	const currentHeaderActionsMode = $derived(headerActionsMode.value);
	const currentHeaderActionsDisplay = $derived(headerActionsMode.displayMode);
	const currentHeaderTabsMode = $derived(headerActionsMode.tabsMode);
	const currentHeaderTabsDisplay = $derived(headerActionsMode.tabsDisplayMode);

	// Local state for currency input
	let currencyInput = $state(displayPreferences.currencySymbol);

	// Date format options
	const dateFormatOptions = [
		{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/31/2024' },
		{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '31/12/2024' },
		{ value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2024-12-31' }
	] as const;

	// Number format options
	const numberFormatOptions = [
		{ value: 'en-US', label: 'English (US)', example: '1,234.56' },
		{ value: 'de-DE', label: 'German', example: '1.234,56' },
		{ value: 'fr-FR', label: 'French', example: '1 234,56' }
	] as const;

	// Header actions mode options
	const headerActionsModeOptions = [
		{ value: 'off', label: 'Keep on page', description: 'Action buttons appear on their respective pages' },
		{ value: 'secondary', label: 'Secondary to header', description: 'Move utility buttons (Analytics, Management) to header' },
		{ value: 'all', label: 'All to header', description: 'Move all action buttons including primary actions to header' }
	] as const;

	// Header actions display options
	const headerActionsDisplayOptions = [
		{ value: 'icon-text', label: 'Icon with text', description: 'Show both icon and label on header action buttons' },
		{ value: 'icon-only', label: 'Icon only', description: 'Show only icons on header action buttons (hover for label)' }
	] as const;

	// Header tabs mode options
	const headerTabsModeOptions = [
		{ value: 'off', label: 'Keep on page', description: 'Tabs appear within the page content' },
		{ value: 'on', label: 'Move to header', description: 'Tabs appear in the app header for a cleaner page layout' }
	] as const;

	// Header tabs display options
	const headerTabsDisplayOptions = [
		{ value: 'icon-text', label: 'Icon with text', description: 'Show both icon and label on header tabs' },
		{ value: 'icon-only', label: 'Icon only', description: 'Show only icons on header tabs (hover for label)' }
	] as const;

	// Table display mode options
	const tableDisplayModeOptions = [
		{ value: 'popover', label: 'Popup dropdown', description: 'Compact popover with collapsible sections' },
		{ value: 'sheet', label: 'Responsive sheet', description: 'Side panel on desktop, drawer on mobile with more space' }
	] as const;

	function handleDateFormatChange(value: string) {
		displayPreferences.setDateFormat(value as DateFormat);
	}

	function handleNumberFormatChange(value: string) {
		displayPreferences.setNumberFormat(value as NumberFormat);
	}

	function handleCurrencyChange() {
		if (currencyInput.trim()) {
			displayPreferences.setCurrencySymbol(currencyInput.trim());
		}
	}

	function handleShowCentsChange(checked: boolean) {
		displayPreferences.setShowCents(checked);
	}

	function handleHeaderActionsModeChange(value: string) {
		headerActionsMode.set(value as HeaderActionsMode);
	}

	function handleHeaderActionsDisplayChange(value: string) {
		headerActionsMode.setDisplay(value as HeaderActionsDisplay);
	}

	function handleHeaderTabsModeChange(value: string) {
		headerActionsMode.setTabs(value as HeaderTabsMode);
	}

	function handleHeaderTabsDisplayChange(value: string) {
		headerActionsMode.setTabsDisplay(value as HeaderTabsDisplay);
	}

	function handleTableDisplayModeChange(value: string) {
		displayPreferences.setTableDisplayMode(value as TableDisplayMode);
	}
</script>

<svelte:head>
	<title>Display - Settings</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Display</h2>
		<p class="text-muted-foreground text-sm">Configure how dates, numbers, and currency are displayed</p>
	</div>

	<!-- Date Format -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Date Format</Card.Title>
			<Card.Description>Choose how dates are displayed throughout the app</Card.Description>
		</Card.Header>
		<Card.Content>
			<RadioGroup.Root value={currentDateFormat} onValueChange={handleDateFormatChange}>
				<div class="space-y-3">
					{#each dateFormatOptions as option}
						<div class="flex items-center space-x-3">
							<RadioGroup.Item value={option.value} id={`date-${option.value}`} />
							<Label for={`date-${option.value}`} class="flex flex-1 cursor-pointer items-center justify-between">
								<span>{option.label}</span>
								<span class="text-muted-foreground text-sm">{option.example}</span>
							</Label>
						</div>
					{/each}
				</div>
			</RadioGroup.Root>
		</Card.Content>
	</Card.Root>

	<!-- Currency Symbol -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Currency Symbol</Card.Title>
			<Card.Description>Set the currency symbol used for monetary values</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex max-w-xs items-center gap-3">
				<Input
					bind:value={currencyInput}
					onblur={handleCurrencyChange}
					placeholder="$"
					class="w-20 text-center" />
				<span class="text-muted-foreground text-sm">
					Preview: {displayPreferences.currencySymbol}1,234.56
				</span>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Number Format -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Number Format</Card.Title>
			<Card.Description>Choose how numbers are formatted (thousands separator, decimal)</Card.Description>
		</Card.Header>
		<Card.Content>
			<RadioGroup.Root value={currentNumberFormat} onValueChange={handleNumberFormatChange}>
				<div class="space-y-3">
					{#each numberFormatOptions as option}
						<div class="flex items-center space-x-3">
							<RadioGroup.Item value={option.value} id={`number-${option.value}`} />
							<Label for={`number-${option.value}`} class="flex flex-1 cursor-pointer items-center justify-between">
								<span>{option.label}</span>
								<span class="text-muted-foreground text-sm">{option.example}</span>
							</Label>
						</div>
					{/each}
				</div>
			</RadioGroup.Root>
		</Card.Content>
	</Card.Root>

	<!-- Show Cents -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Decimal Places</Card.Title>
			<Card.Description>Control whether cents are displayed in currency values</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label for="show-cents">Show cents</Label>
					<p class="text-muted-foreground text-sm">
						{currentShowCents ? 'Displaying: $1,234.56' : 'Displaying: $1,235'}
					</p>
				</div>
				<Switch id="show-cents" checked={currentShowCents} onCheckedChange={handleShowCentsChange} />
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Header Actions -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Header Actions</Card.Title>
			<Card.Description>Choose where page action buttons are displayed</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				{#each headerActionsModeOptions as option}
					<Label
						class="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-aria-checked:border-primary has-aria-checked:bg-primary/10"
					>
						<Checkbox
							checked={currentHeaderActionsMode === option.value}
							onCheckedChange={() => handleHeaderActionsModeChange(option.value)}
							class="data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
						/>
						<div class="grid gap-1.5 font-normal">
							<p class="text-sm font-medium leading-none">{option.label}</p>
							<p class="text-muted-foreground text-sm">{option.description}</p>
						</div>
					</Label>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Header Actions Display -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Header Actions Display</Card.Title>
			<Card.Description>Choose how header action buttons are displayed</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				{#each headerActionsDisplayOptions as option}
					<Label
						class="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-aria-checked:border-primary has-aria-checked:bg-primary/10"
					>
						<Checkbox
							checked={currentHeaderActionsDisplay === option.value}
							onCheckedChange={() => handleHeaderActionsDisplayChange(option.value)}
							class="data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
						/>
						<div class="grid gap-1.5 font-normal">
							<p class="text-sm font-medium leading-none">{option.label}</p>
							<p class="text-muted-foreground text-sm">{option.description}</p>
						</div>
					</Label>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Header Tabs -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Header Tabs</Card.Title>
			<Card.Description>Move page navigation tabs to the header for a cleaner layout</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				{#each headerTabsModeOptions as option}
					<Label
						class="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-aria-checked:border-primary has-aria-checked:bg-primary/10"
					>
						<Checkbox
							checked={currentHeaderTabsMode === option.value}
							onCheckedChange={() => handleHeaderTabsModeChange(option.value)}
							class="data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
						/>
						<div class="grid gap-1.5 font-normal">
							<p class="text-sm font-medium leading-none">{option.label}</p>
							<p class="text-muted-foreground text-sm">{option.description}</p>
						</div>
					</Label>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Header Tabs Display -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Header Tabs Display</Card.Title>
			<Card.Description>Choose how header tabs are displayed</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				{#each headerTabsDisplayOptions as option}
					<Label
						class="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-aria-checked:border-primary has-aria-checked:bg-primary/10"
					>
						<Checkbox
							checked={currentHeaderTabsDisplay === option.value}
							onCheckedChange={() => handleHeaderTabsDisplayChange(option.value)}
							class="data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
						/>
						<div class="grid gap-1.5 font-normal">
							<p class="text-sm font-medium leading-none">{option.label}</p>
							<p class="text-muted-foreground text-sm">{option.description}</p>
						</div>
					</Label>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Table Display Options -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Table Display Options</Card.Title>
			<Card.Description>Choose how table column and display settings appear</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				{#each tableDisplayModeOptions as option}
					<Label
						class="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-aria-checked:border-primary has-aria-checked:bg-primary/10"
					>
						<Checkbox
							checked={currentTableDisplayMode === option.value}
							onCheckedChange={() => handleTableDisplayModeChange(option.value)}
							class="data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
						/>
						<div class="grid gap-1.5 font-normal">
							<p class="text-sm font-medium leading-none">{option.label}</p>
							<p class="text-muted-foreground text-sm">{option.description}</p>
						</div>
					</Label>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>
</div>
