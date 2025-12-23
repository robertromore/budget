<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Switch } from "$lib/components/ui/switch";
  import type { ModelInfo } from "$lib/schema/llm-models";
  import type { LLMProvider } from "$lib/schema/workspaces";
  import { cn } from "$lib/utils";
  import Check from "@lucide/svelte/icons/check";
  import Download from "@lucide/svelte/icons/download";
  import Eye from "@lucide/svelte/icons/eye";
  import EyeOff from "@lucide/svelte/icons/eye-off";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Star from "@lucide/svelte/icons/star";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Wrench from "@lucide/svelte/icons/wrench";
  import type { Component } from "svelte";

  interface Props {
    provider: LLMProvider;
    title: string;
    description: string;
    icon?: Component;
    enabled: boolean;
    model: string;
    hasApiKey?: boolean;
    endpoint?: string;
    showEndpoint?: boolean;
    isDefault?: boolean;
    disabled?: boolean;
    isTesting?: boolean;
    isSaving?: boolean;
    models?: ModelInfo[];
    onToggle?: (enabled: boolean) => void;
    onModelChange?: (model: string) => void;
    onApiKeyChange?: (apiKey: string) => void;
    onEndpointChange?: (endpoint: string) => void;
    onSave?: () => void;
    onTest?: () => void;
    onClearApiKey?: () => void;
    onSetDefault?: () => void;
    class?: string;
  }

  let {
    provider,
    title,
    description,
    icon: Icon,
    enabled = $bindable(),
    model = $bindable(),
    hasApiKey = false,
    endpoint = $bindable(),
    showEndpoint = false,
    isDefault = false,
    disabled = false,
    isTesting = false,
    isSaving = false,
    models = [],
    onToggle,
    onModelChange,
    onApiKeyChange,
    onEndpointChange,
    onSave,
    onTest,
    onClearApiKey,
    onSetDefault,
    class: className,
  }: Props = $props();

  let showApiKey = $state(false);
  let localApiKey = $state("");

  function handleToggle(checked: boolean) {
    enabled = checked;
    onToggle?.(checked);
  }

  function handleModelSelect(value: string) {
    model = value;
    onModelChange?.(value);
  }

  function handleApiKeyInput(e: Event) {
    const target = e.target as HTMLInputElement;
    localApiKey = target.value;
    onApiKeyChange?.(target.value);
  }

  function handleEndpointInput(e: Event) {
    const target = e.target as HTMLInputElement;
    endpoint = target.value;
    onEndpointChange?.(target.value);
  }
</script>

<Card.Root
  class={cn(
    "transition-colors",
    {
      "opacity-50": disabled,
      "border-primary/30 bg-primary/5": enabled && !disabled,
      "ring-2 ring-primary": isDefault,
    },
    className
  )}
>
  <Card.Header class="pb-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
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
        <div>
          <div class="flex items-center gap-2">
            <Card.Title class="text-base">{title}</Card.Title>
            {#if isDefault}
              <Badge variant="outline" class="text-xs">
                <Star class="mr-1 h-3 w-3" />
                Default
              </Badge>
            {/if}
          </div>
          <Card.Description class="text-xs">{description}</Card.Description>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={handleToggle} {disabled} />
    </div>
  </Card.Header>

  {#if enabled}
    <Card.Content class="space-y-4">
      <!-- API Key (not for Ollama) -->
      {#if provider !== "ollama"}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label for={`${provider}-api-key`}>API Key</Label>
            {#if hasApiKey}
              <Button
                variant="ghost"
                size="sm"
                onclick={onClearApiKey}
                class="text-destructive hover:text-destructive h-6 px-2 text-xs"
              >
                <Trash2 class="mr-1 h-3 w-3" />
                Clear
              </Button>
            {/if}
          </div>
          <div class="relative">
            <Input
              id={`${provider}-api-key`}
              type={showApiKey ? "text" : "password"}
              placeholder={hasApiKey ? "API key saved (enter new to replace)" : "Enter API key"}
              value={localApiKey}
              oninput={handleApiKeyInput}
              class="pr-10"
            />
            <Button
              variant="ghost"
              size="icon"
              class="absolute right-0 top-0 h-9 w-9"
              onclick={() => (showApiKey = !showApiKey)}
            >
              {#if showApiKey}
                <EyeOff class="h-4 w-4" />
              {:else}
                <Eye class="h-4 w-4" />
              {/if}
            </Button>
          </div>
          {#if hasApiKey}
            <p class="text-muted-foreground text-xs">API key is stored encrypted</p>
          {/if}
        </div>
      {/if}

      <!-- Endpoint (for Ollama) -->
      {#if showEndpoint}
        <div class="space-y-2">
          <Label for={`${provider}-endpoint`}>Endpoint URL</Label>
          <Input
            id={`${provider}-endpoint`}
            placeholder="http://localhost:11434"
            value={endpoint}
            oninput={handleEndpointInput}
          />
          <p class="text-muted-foreground text-xs">
            Local Ollama server endpoint
          </p>
        </div>
      {/if}

      <!-- Model Selection -->
      <div class="space-y-3">
        <Label>Model</Label>
        <div class="bg-muted/50 max-h-70 overflow-y-auto rounded-lg border p-2">
          <RadioGroup.Root value={model} onValueChange={handleModelSelect} class="space-y-1.5">
            {#each models as modelOption}
              <label
                for={`${provider}-model-${modelOption.id}`}
                class={cn(
                  "bg-background flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  "hover:bg-accent/50",
                  model === modelOption.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/50"
                )}
              >
                <RadioGroup.Item value={modelOption.id} id={`${provider}-model-${modelOption.id}`} class="mt-0.5" />
                <div class="flex-1 space-y-0.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-sm font-medium">{modelOption.name}</span>
                    {#if modelOption.recommended}
                      <Badge variant="secondary" class="h-5 gap-1 px-1.5 text-[10px]">
                        <Sparkles class="h-3 w-3" />
                        Recommended
                      </Badge>
                    {/if}
                    {#if modelOption.supportsTools}
                      <Badge variant="outline" class="h-5 gap-1 px-1.5 text-[10px] border-blue-500/30 text-blue-600 dark:text-blue-400">
                        <Wrench class="h-3 w-3" />
                        Tools
                      </Badge>
                    {/if}
                    {#if provider === "ollama" && modelOption.installed === false}
                      <Badge variant="outline" class="h-5 gap-1 px-1.5 text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                        <Download class="h-3 w-3" />
                        Not installed
                      </Badge>
                    {/if}
                  </div>
                  {#if modelOption.description}
                    <p class="text-muted-foreground/80 text-xs leading-snug">{modelOption.description}</p>
                  {/if}
                </div>
              </label>
            {/each}
          </RadioGroup.Root>
        </div>
        {#if provider === "ollama"}
          {@const selectedModel = models.find((m) => m.id === model)}
          {#if selectedModel?.installed === false}
            <p class="text-muted-foreground text-xs">
              To install this model, run: <code class="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">ollama pull {model}</code>
            </p>
          {/if}
        {/if}
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between pt-2">
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onclick={onTest}
            disabled={isTesting || (provider !== "ollama" && !hasApiKey && !localApiKey)}
          >
            {#if isTesting}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Test
          </Button>
          <Button size="sm" onclick={onSave} disabled={isSaving}>
            {#if isSaving}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {:else}
              <Check class="mr-2 h-4 w-4" />
            {/if}
            Save
          </Button>
        </div>
        {#if !isDefault && hasApiKey}
          <Button variant="ghost" size="sm" onclick={onSetDefault}>
            Set as Default
          </Button>
        {/if}
      </div>
    </Card.Content>
  {/if}
</Card.Root>
