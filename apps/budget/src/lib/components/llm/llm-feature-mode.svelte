<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import * as Select from "$lib/components/ui/select";
  import type { LLMFeatureConfig, LLMFeatureMode, LLMProvider } from "$lib/schema/workspaces";
  import { cn } from "$lib/utils";
  import type { Component } from "svelte";

  interface ProviderOption {
    value: LLMProvider;
    label: string;
    enabled: boolean;
  }

  interface Props {
    title: string;
    description: string;
    icon?: Component;
    config: LLMFeatureConfig;
    defaultProvider: LLMProvider | null;
    providers: ProviderOption[];
    disabled?: boolean;
    onConfigChange?: (config: LLMFeatureConfig) => void;
    class?: string;
  }

  let {
    title,
    description,
    icon: Icon,
    config = $bindable(),
    defaultProvider,
    providers,
    disabled = false,
    onConfigChange,
    class: className,
  }: Props = $props();

  // Get enabled providers for the dropdown
  const enabledProviders = $derived(providers.filter((p) => p.enabled));

  // Current provider display value
  const currentProviderLabel = $derived(() => {
    if (config.provider) {
      const provider = providers.find((p) => p.value === config.provider);
      return provider?.label ?? config.provider;
    }
    if (defaultProvider) {
      const provider = providers.find((p) => p.value === defaultProvider);
      return `Default (${provider?.label ?? defaultProvider})`;
    }
    return "Use Default";
  });

  function handleModeChange(value: string | undefined) {
    if (value) {
      const newConfig = { ...config, mode: value as LLMFeatureMode };
      config = newConfig;
      onConfigChange?.(newConfig);
    }
  }

  function handleProviderChange(value: string | undefined) {
    // null means use default provider
    const newProvider = value === "default" ? null : (value as LLMProvider);
    const newConfig = { ...config, provider: newProvider };
    config = newConfig;
    onConfigChange?.(newConfig);
  }
</script>

<Card.Root class={cn("transition-colors", { "opacity-50": disabled }, className)}>
  <Card.Content class="p-4">
    <div class="flex items-start gap-4">
      {#if Icon}
        <div class="bg-muted rounded-lg p-2">
          <Icon class="text-muted-foreground h-5 w-5" />
        </div>
      {/if}

      <div class="flex-1 space-y-3">
        <div>
          <h4 class="text-sm font-medium">{title}</h4>
          <p class="text-muted-foreground text-xs">{description}</p>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <RadioGroup.Root
            value={config.mode}
            onValueChange={handleModeChange}
            {disabled}
            class="flex gap-4"
          >
            <div class="flex items-center space-x-2">
              <RadioGroup.Item value="disabled" id={`${title}-disabled`} />
              <Label for={`${title}-disabled`} class="cursor-pointer text-sm font-normal">
                Disabled
              </Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroup.Item value="enhance" id={`${title}-enhance`} />
              <Label for={`${title}-enhance`} class="cursor-pointer text-sm font-normal">
                Enhance ML
              </Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroup.Item value="override" id={`${title}-override`} />
              <Label for={`${title}-override`} class="cursor-pointer text-sm font-normal">
                Override ML
              </Label>
            </div>
          </RadioGroup.Root>

          {#if config.mode !== "disabled" && enabledProviders.length > 0}
            <div class="flex items-center gap-2">
              <Label class="text-muted-foreground text-xs">Provider:</Label>
              <Select.Root
                type="single"
                value={config.provider ?? "default"}
                onValueChange={handleProviderChange}
                disabled={disabled}
              >
                <Select.Trigger class="h-8 w-[180px] text-xs">
                  {currentProviderLabel()}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="default">
                    {#if defaultProvider}
                      {@const defaultLabel =
                        providers.find((p) => p.value === defaultProvider)?.label ?? defaultProvider}
                      Use Default ({defaultLabel})
                    {:else}
                      Use Default
                    {/if}
                  </Select.Item>
                  {#each enabledProviders as provider (provider.value)}
                    <Select.Item value={provider.value}>
                      {provider.label}
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </Card.Content>
</Card.Root>
