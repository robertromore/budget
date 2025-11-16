<script lang="ts">
import { cn } from '$lib/utils';
import Brain from '@lucide/svelte/icons/brain';
import Check from '@lucide/svelte/icons/check';
import Info from '@lucide/svelte/icons/info';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import Sparkles from '@lucide/svelte/icons/sparkles';
import X from '@lucide/svelte/icons/x';
import Zap from '@lucide/svelte/icons/zap';
import type { Component } from 'svelte';

type SuggestionType = 'smart' | 'intelligent' | 'insight' | 'auto' | 'info';
type SuggestionVariant = 'default' | 'success' | 'warning' | 'info' | 'accent';

interface Props {
  type?: SuggestionType;
  variant?: SuggestionVariant;
  confidence?: number;
  reason?: string;
  dismissible?: boolean;
  applied?: boolean;
  class?: string;
  onDismiss?: () => void;
  onApply?: () => void;
  children?: import('svelte').Snippet;
}

let {
  type = 'smart',
  variant = 'default',
  confidence,
  reason,
  dismissible = false,
  applied = false,
  class: className,
  onDismiss,
  onApply,
  children,
}: Props = $props();

const typeIconMap: Record<SuggestionType, Component> = {
  smart: Sparkles,
  intelligent: Brain,
  insight: Lightbulb,
  auto: Zap,
  info: Info,
};

const Icon = $derived(typeIconMap[type]);

const getVariantStyles = (variant: SuggestionVariant, applied: boolean) => {
  if (applied) {
    return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800';
  }

  switch (variant) {
    case 'success':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-100 dark:border-yellow-800';
    case 'info':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800';
    case 'accent':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-800';
    default:
      return 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/30';
  }
};

const confidenceColor = $derived(() => {
  if (!confidence) return '';
  if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
});

const confidencePercentage = $derived(() => {
  return confidence ? Math.round(confidence * 100) : null;
});
</script>

<div
  class={cn(
    'group inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-all duration-300 ease-out',
    'animate-in fade-in-0 slide-in-from-top-2',
    getVariantStyles(variant, applied),
    applied && 'scale-105 ring-1 ring-green-300 dark:ring-green-700',
    className
  )}
  style="animation-duration: 400ms;"
  title={reason ||
    `${type} suggestion${confidence ? ` (${confidencePercentage}% confidence)` : ''}`}>
  <Icon class="h-3 w-3 shrink-0" />

  {#if children}
    {@render children()}
  {:else}
    <span class="capitalize">
      {applied ? 'Applied' : type}
      {#if confidence}
        <span class={cn('ml-1 font-mono', confidenceColor)}>
          {confidencePercentage}%
        </span>
      {/if}
    </span>
  {/if}

  {#if !applied && onApply}
    <button
      type="button"
      onclick={onApply}
      class="ml-1 rounded p-0.5 transition-colors hover:bg-white/20 dark:hover:bg-black/20"
      title="Apply suggestion">
      <Check class="h-2.5 w-2.5" />
    </button>
  {/if}

  {#if dismissible && onDismiss}
    <button
      type="button"
      onclick={onDismiss}
      class="ml-1 rounded p-0.5 transition-colors hover:bg-white/20 dark:hover:bg-black/20"
      title="Dismiss suggestion">
      <X class="h-2.5 w-2.5" />
    </button>
  {/if}
</div>
