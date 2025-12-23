<script lang="ts">
	import { Response } from "$lib/components/ai-elements/response";
	import { Suggestion, Suggestions } from "$lib/components/ai-elements/suggestion";
	import { Artifact, ArtifactHeader, ArtifactTitle, ArtifactContent } from "$lib/components/ai-elements/artifact";
	import { Button } from "$lib/components/ui/button";
	import { Alert, AlertDescription, AlertTitle } from "$lib/components/ui/alert";
	import { parseAIResponse, type SuggestionItem, type InsightBlock, type ActionBlock } from "$lib/utils/ai-response-parser";
	import { goto } from "$app/navigation";
	import { AlertCircle, CheckCircle2, Info, AlertTriangle, ArrowRight, BarChart3, PieChart, Wallet, Calendar } from "@lucide/svelte/icons";
	import type { Component as SvelteComponent } from "svelte";

	interface Props {
		content: string;
		onSuggestionClick?: (suggestion: string) => void;
		class?: string;
	}

	let { content, onSuggestionClick, class: className }: Props = $props();

	// Parse the response content
	let parsed = $derived(parseAIResponse(content));

	// Get icon for insight type
	function getInsightIcon(type: InsightBlock["type"]): SvelteComponent {
		switch (type) {
			case "success":
				return CheckCircle2;
			case "warning":
				return AlertTriangle;
			case "error":
				return AlertCircle;
			default:
				return Info;
		}
	}

	// Get variant for insight alert
	function getInsightVariant(type: InsightBlock["type"]): "default" | "destructive" {
		return type === "error" ? "destructive" : "default";
	}

	// Get icon for action
	function getActionIcon(iconName?: string): SvelteComponent {
		switch (iconName) {
			case "chart":
				return BarChart3;
			case "pie":
				return PieChart;
			case "wallet":
				return Wallet;
			case "calendar":
				return Calendar;
			default:
				return ArrowRight;
		}
	}

	// Handle action click
	function handleActionClick(action: ActionBlock) {
		goto(action.target);
	}

	// Handle suggestion click
	function handleSuggestionClick(text: string) {
		onSuggestionClick?.(text);
	}

	// Get suggestion variant based on type
	function getSuggestionVariant(type?: SuggestionItem["type"]): "outline" | "default" | "secondary" {
		switch (type) {
			case "success":
				return "default";
			case "warning":
				return "secondary";
			default:
				return "outline";
		}
	}
</script>

<div class="space-y-4 {className}">
	{#each parsed.parts as part, i (i)}
		{#if part.type === "text"}
			<Response content={part.content} />

		{:else if part.type === "suggestions"}
			<Suggestions class="py-2">
				{#each part.items as item, j (j)}
					<Suggestion
						suggestion={item.text}
						variant={getSuggestionVariant(item.type)}
						onclick={() => handleSuggestionClick(item.text)}
					/>
				{/each}
			</Suggestions>

		{:else if part.type === "insight"}
			{@const InsightIcon = getInsightIcon(part.data.type)}
			<Alert variant={getInsightVariant(part.data.type)} class="my-3">
				<InsightIcon class="size-4" />
				<AlertTitle>{part.data.title}</AlertTitle>
				<AlertDescription>{part.data.message}</AlertDescription>
			</Alert>

		{:else if part.type === "action"}
			{@const ActionIcon = getActionIcon(part.data.icon)}
			<Button
				variant="outline"
				class="my-2 w-full justify-between"
				onclick={() => handleActionClick(part.data)}
			>
				{part.data.label}
				<ActionIcon class="ml-2 size-4" />
			</Button>
		{/if}
	{/each}
</div>
