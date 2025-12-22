<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Switch } from "$lib/components/ui/switch";
  import { cn } from "$lib/utils";
  import type { Component } from "svelte";

  interface Props {
    title: string;
    description: string;
    enabled: boolean;
    icon?: Component;
    disabled?: boolean;
    onToggle?: (enabled: boolean) => void;
    class?: string;
  }

  let {
    title,
    description,
    enabled = $bindable(),
    icon: Icon,
    disabled = false,
    onToggle,
    class: className,
  }: Props = $props();

  function handleToggle() {
    if (disabled) return;
    enabled = !enabled;
    onToggle?.(enabled);
  }
</script>

<Card.Root
  class={cn(
    "transition-colors",
    {
      "opacity-50": disabled,
      "border-primary/20 bg-primary/5": enabled && !disabled,
    },
    className
  )}
>
  <Card.Content class="flex items-center gap-4 p-4">
    {#if Icon}
      <div
        class={cn("rounded-lg p-2", {
          "bg-primary/10 text-primary": enabled,
          "bg-muted text-muted-foreground": !enabled,
        })}
      >
        <Icon class="h-5 w-5" />
      </div>
    {/if}

    <div class="flex-1 space-y-0.5">
      <h4 class="text-sm font-medium">{title}</h4>
      <p class="text-muted-foreground text-xs">{description}</p>
    </div>

    <Switch checked={enabled} onCheckedChange={handleToggle} {disabled} />
  </Card.Content>
</Card.Root>
