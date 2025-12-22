<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { THEME_PRESETS, getThemePreviewColor } from '$lib/config/theme-presets';
	import { fontSize, type FontSize } from '$lib/stores/font-size.svelte';
	import { themePreferences } from '$lib/stores/theme-preferences.svelte';
	import Check from '@lucide/svelte/icons/check';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Moon from '@lucide/svelte/icons/moon';
	import Palette from '@lucide/svelte/icons/palette';
	import Sun from '@lucide/svelte/icons/sun';
	import { setMode, userPrefersMode } from 'mode-watcher';

	// Reactive state for current values
	const currentMode = $derived(userPrefersMode.current);
	const currentTheme = $derived(themePreferences.theme);
	const currentFontSize = $derived(fontSize.current);

	// Mode options
	const modeOptions = [
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'system', label: 'System', icon: Monitor }
	] as const;

	// Font size options
	const fontSizeOptions = [
		{ value: 'small', label: 'Small', size: '14px' },
		{ value: 'normal', label: 'Normal', size: '16px' },
		{ value: 'large', label: 'Large', size: '18px' }
	] as const;

	function handleModeChange(value: string) {
		setMode(value as 'light' | 'dark' | 'system');
	}

	function handleFontSizeChange(value: string) {
		fontSize.set(value as FontSize);
	}

	function handleThemeSelect(presetName: string) {
		themePreferences.setPreset(presetName);
	}
</script>

<svelte:head>
	<title>Appearance - Settings</title>
</svelte:head>

<div class="space-y-6">
	<div data-help-id="settings-appearance" data-help-title="Appearance Settings">
		<h2 class="text-xl font-semibold">Appearance</h2>
		<p class="text-muted-foreground text-sm">Customize how the app looks</p>
	</div>

	<!-- Color Mode -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Color Mode</Card.Title>
			<Card.Description>Choose between light, dark, or system theme</Card.Description>
		</Card.Header>
		<Card.Content>
			<RadioGroup.Root value={currentMode ?? 'system'} onValueChange={handleModeChange}>
				<div class="grid grid-cols-3 gap-4">
					{#each modeOptions as option}
						{@const Icon = option.icon}
						<Label
							class="border-muted hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors">
							<RadioGroup.Item value={option.value} class="sr-only" />
							<Icon class="h-6 w-6" />
							<span class="text-sm font-medium">{option.label}</span>
						</Label>
					{/each}
				</div>
			</RadioGroup.Root>
		</Card.Content>
	</Card.Root>

	<!-- Theme Color -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Palette class="h-5 w-5" />
				Theme Color
			</Card.Title>
			<Card.Description>Select an accent color for your app</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-4 gap-3 sm:grid-cols-6">
				{#each THEME_PRESETS as preset}
					{@const isSelected = currentTheme === preset.name}
					{@const previewColor = getThemePreviewColor(preset)}

					<button
						type="button"
						onclick={() => handleThemeSelect(preset.name)}
						class="group hover:border-primary relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors"
						class:border-primary={isSelected}
						class:border-muted={!isSelected}>
						{#if isSelected}
							<div class="absolute -top-1 -right-1">
								<div
									class="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full">
									<Check class="h-2.5 w-2.5" />
								</div>
							</div>
						{/if}
						<div class="h-8 w-8 rounded-full border" style:background-color={previewColor}></div>
						<span class="text-xs font-medium">{preset.label}</span>
					</button>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Font Size -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Font Size</Card.Title>
			<Card.Description>Adjust the text size throughout the app</Card.Description>
		</Card.Header>
		<Card.Content>
			<RadioGroup.Root value={currentFontSize} onValueChange={handleFontSizeChange}>
				<div class="grid grid-cols-3 gap-4">
					{#each fontSizeOptions as option}
						<Label
							class="border-muted hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 p-4 transition-colors">
							<RadioGroup.Item value={option.value} class="sr-only" />
							<span class="text-lg font-medium" style:font-size={option.size}>Aa</span>
							<span class="text-muted-foreground text-xs">{option.label}</span>
						</Label>
					{/each}
				</div>
			</RadioGroup.Root>
		</Card.Content>
	</Card.Root>
</div>
