<script lang="ts">
import type {DetectedPattern} from '$lib/schema/detected-patterns';
import PatternCard from './pattern-card.svelte';
import {Button} from '$lib/components/ui/button';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '$lib/components/ui/tabs';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import Sparkles from '@lucide/svelte/icons/sparkles';

interface PatternListProps {
  patterns: DetectedPattern[];
  isLoading?: boolean;
  onConvert?: (scheduleId: number) => void;
  onDismiss?: () => void;
}

let {patterns, isLoading = false, onConvert, onDismiss}: PatternListProps = $props();

const pendingPatterns = $derived(patterns.filter((p) => p.status === 'pending'));
const convertedPatterns = $derived(patterns.filter((p) => p.status === 'converted'));
const dismissedPatterns = $derived(patterns.filter((p) => p.status === 'dismissed'));

let selectedTab = $state('pending');
</script>

{#if isLoading}
  <div class="flex items-center justify-center py-12">
    <div class="text-center">
      <div
        class="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent">
      </div>
      <p class="text-muted-foreground text-sm">Loading patterns...</p>
    </div>
  </div>
{:else if patterns.length === 0}
  <div
    class="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
    <Sparkles class="text-muted-foreground/50 mb-4 h-12 w-12"></Sparkles>
    <h3 class="mb-2 text-lg font-semibold">No patterns detected</h3>
    <p class="text-muted-foreground mb-4 max-w-md text-sm">
      Run pattern detection to analyze your transaction history and discover recurring patterns.
    </p>
  </div>
{:else}
  <Tabs bind:value={selectedTab} class="w-full">
    <TabsList class="grid w-full grid-cols-3">
      <TabsTrigger value="pending">
        Pending
        {#if pendingPatterns.length > 0}
          <span
            class="bg-primary/20 text-primary ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
            {pendingPatterns.length}
          </span>
        {/if}
      </TabsTrigger>
      <TabsTrigger value="converted">
        Converted
        {#if convertedPatterns.length > 0}
          <span
            class="bg-primary/20 text-primary ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
            {convertedPatterns.length}
          </span>
        {/if}
      </TabsTrigger>
      <TabsTrigger value="dismissed">
        Dismissed
        {#if dismissedPatterns.length > 0}
          <span
            class="bg-primary/20 text-primary ml-2 rounded-full px-2 py-0.5 text-xs font-medium">
            {dismissedPatterns.length}
          </span>
        {/if}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="pending" class="mt-6">
      {#if pendingPatterns.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <CircleAlert class="text-muted-foreground/50 mb-4 h-12 w-12"></CircleAlert>
          <h3 class="mb-2 text-lg font-semibold">No pending patterns</h3>
          <p class="text-muted-foreground max-w-md text-sm">
            All detected patterns have been reviewed. Run detection again to find new patterns.
          </p>
        </div>
      {:else}
        <div class="flex flex-col gap-4">
          {#each pendingPatterns as pattern (pattern.id)}
            <PatternCard {pattern} {onConvert} {onDismiss}></PatternCard>
          {/each}
        </div>
      {/if}
    </TabsContent>

    <TabsContent value="converted" class="mt-6">
      {#if convertedPatterns.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <CircleAlert class="text-muted-foreground/50 mb-4 h-12 w-12"></CircleAlert>
          <h3 class="mb-2 text-lg font-semibold">No converted patterns</h3>
          <p class="text-muted-foreground max-w-md text-sm">
            Patterns you convert to schedules will appear here.
          </p>
        </div>
      {:else}
        <div class="flex flex-col gap-4">
          {#each convertedPatterns as pattern (pattern.id)}
            <PatternCard {pattern} {onConvert} {onDismiss}></PatternCard>
          {/each}
        </div>
      {/if}
    </TabsContent>

    <TabsContent value="dismissed" class="mt-6">
      {#if dismissedPatterns.length === 0}
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <CircleAlert class="text-muted-foreground/50 mb-4 h-12 w-12"></CircleAlert>
          <h3 class="mb-2 text-lg font-semibold">No dismissed patterns</h3>
          <p class="text-muted-foreground max-w-md text-sm">
            Patterns you dismiss will appear here.
          </p>
        </div>
      {:else}
        <div class="flex flex-col gap-4">
          {#each dismissedPatterns as pattern (pattern.id)}
            <PatternCard {pattern} {onConvert} {onDismiss}></PatternCard>
          {/each}
        </div>
      {/if}
    </TabsContent>
  </Tabs>
{/if}
