<script lang="ts">
  import { LLMFeatureMode, LLMProviderCard } from "$lib/components/llm";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Switch } from "$lib/components/ui/switch";
  import { LLMSettings } from "$lib/query/llm-settings";
  import { LLM_MODELS } from "$lib/schema/llm-models";
  import type { LLMFeatureConfig, LLMProvider } from "$lib/schema/workspaces";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Bot from "@lucide/svelte/icons/bot";
  import BrainCircuit from "@lucide/svelte/icons/brain-circuit";
  import FileText from "@lucide/svelte/icons/file-text";
  import FolderSearch from "@lucide/svelte/icons/folder-search";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Tags from "@lucide/svelte/icons/tags";
  import TrendingUp from "@lucide/svelte/icons/trending-up";

  // Queries
  const preferencesQuery = LLMSettings.getPreferences().options();

  // Mutations
  const toggleMutation = LLMSettings.toggle().options();
  const updateProviderMutation = LLMSettings.updateProvider().options();
  const updateProviderSilentMutation = LLMSettings.updateProviderSilent().options();
  const clearApiKeyMutation = LLMSettings.clearApiKey().options();
  const setDefaultMutation = LLMSettings.setDefaultProvider().options();
  const updateFeatureModesMutation = LLMSettings.updateFeatureModes().options();
  const testConnectionMutation = LLMSettings.testConnection().options();

  // Local state for form
  let enabled = $state(false);
  let defaultProvider = $state<LLMProvider | null>(null);
  let featureModes = $state<Record<string, LLMFeatureConfig>>({
    transactionParsing: { mode: "disabled", provider: null },
    categorySuggestion: { mode: "disabled", provider: null },
    anomalyDetection: { mode: "disabled", provider: null },
    forecasting: { mode: "disabled", provider: null },
    payeeMatching: { mode: "disabled", provider: null },
  });

  // Provider-specific state (defaults match recommended models)
  let providerConfigs = $state<Record<LLMProvider, { enabled: boolean; model: string; endpoint?: string; apiKey?: string }>>({
    openai: { enabled: false, model: "gpt-4.1-mini" },
    anthropic: { enabled: false, model: "claude-haiku-4-5-20251015" },
    google: { enabled: false, model: "gemini-3-flash" },
    ollama: { enabled: false, model: "llama3.3", endpoint: "http://localhost:11434" },
  });

  // Testing state per provider
  let testingProvider = $state<LLMProvider | null>(null);
  let savingProvider = $state<LLMProvider | null>(null);

  // Ollama models - fetch dynamically from local server
  let ollamaEndpoint = $derived(providerConfigs.ollama.endpoint || "http://localhost:11434");
  const ollamaModelsQuery = $derived(LLMSettings.getOllamaModels(ollamaEndpoint).options(() => ({
    enabled: providerConfigs.ollama.enabled,
  })));

  // Combine dynamic Ollama models with fallback to hardcoded list
  const ollamaModels = $derived.by(() => {
    if (ollamaModelsQuery.data?.success && ollamaModelsQuery.data.models.length > 0) {
      return ollamaModelsQuery.data.models;
    }
    // Fallback to hardcoded models if fetch fails or returns empty
    return LLM_MODELS.ollama;
  });

  // Sync with query data
  $effect(() => {
    if (preferencesQuery.data) {
      enabled = preferencesQuery.data.enabled;
      defaultProvider = preferencesQuery.data.defaultProvider;

      // Normalize feature modes (handle both old string format and new object format)
      for (const [key, value] of Object.entries(preferencesQuery.data.featureModes)) {
        if (typeof value === "string") {
          featureModes[key] = { mode: value, provider: null };
        } else {
          featureModes[key] = { ...value };
        }
      }

      // Update provider configs - mutate properties instead of replacing object
      // to ensure reactivity works with bound components
      for (const provider of ["openai", "anthropic", "google", "ollama"] as LLMProvider[]) {
        const cfg = preferencesQuery.data.providers[provider];
        if (cfg) {
          providerConfigs[provider].enabled = cfg.enabled;
          providerConfigs[provider].model = cfg.model;
          providerConfigs[provider].endpoint = cfg.endpoint;
        }
      }
    }
  });

  function handleToggle() {
    toggleMutation.mutate({ enabled: !enabled });
    enabled = !enabled;
  }

  function handleProviderSave(provider: LLMProvider) {
    savingProvider = provider;
    const config = providerConfigs[provider];
    updateProviderMutation.mutate(
      {
        provider,
        config: {
          enabled: config.enabled,
          model: config.model,
          endpoint: config.endpoint,
          apiKey: config.apiKey,
        },
      },
      {
        onSettled: () => {
          savingProvider = null;
          // Clear local API key after save
          providerConfigs[provider].apiKey = undefined;
        },
      }
    );
  }

  function handleProviderToggle(provider: LLMProvider, val: boolean) {
    providerConfigs[provider].enabled = val;

    if (val) {
      // When enabling, check if this is the only enabled provider
      const enabledProviders = (["openai", "anthropic", "google", "ollama"] as LLMProvider[]).filter(
        (p) => providerConfigs[p].enabled
      );
      const shouldSetDefault = enabledProviders.length === 1;

      // Auto-save when enabling, and chain setDefault after save completes to avoid race condition
      // Use silent mutation if we'll show a "set as default" toast afterwards
      savingProvider = provider;
      const config = providerConfigs[provider];
      const mutation = shouldSetDefault ? updateProviderSilentMutation : updateProviderMutation;
      mutation.mutate(
        {
          provider,
          config: {
            enabled: config.enabled,
            model: config.model,
            endpoint: config.endpoint,
            apiKey: config.apiKey,
          },
        },
        {
          onSuccess: () => {
            // Only set as default AFTER the provider save completes to avoid race condition
            if (shouldSetDefault) {
              handleSetDefault(provider);
            }
          },
          onSettled: () => {
            savingProvider = null;
            providerConfigs[provider].apiKey = undefined;
          },
        }
      );
    } else {
      // When disabling, check if we need to change the default provider
      const wasDefault = defaultProvider === provider;
      const otherEnabled = wasDefault
        ? (["openai", "anthropic", "google", "ollama"] as LLMProvider[]).find(
            (p) => p !== provider && providerConfigs[p].enabled
          )
        : null;

      // Auto-save when disabling, and chain default provider change after save completes
      // Use silent mutation if we'll show a "default changed" toast afterwards
      savingProvider = provider;
      const config = providerConfigs[provider];
      const mutation = wasDefault ? updateProviderSilentMutation : updateProviderMutation;
      mutation.mutate(
        {
          provider,
          config: {
            enabled: config.enabled,
            model: config.model,
            endpoint: config.endpoint,
            apiKey: config.apiKey,
          },
        },
        {
          onSuccess: () => {
            // Only change default AFTER the provider save completes to avoid race condition
            if (wasDefault) {
              if (otherEnabled) {
                handleSetDefault(otherEnabled);
              } else {
                defaultProvider = null;
                setDefaultMutation.mutate({ provider: null });
              }
            }
          },
          onSettled: () => {
            savingProvider = null;
            providerConfigs[provider].apiKey = undefined;
          },
        }
      );
    }
  }

  function handleProviderTest(provider: LLMProvider) {
    testingProvider = provider;
    testConnectionMutation.mutate(
      {
        provider,
        apiKey: providerConfigs[provider].apiKey,
      },
      {
        onSettled: () => {
          testingProvider = null;
        },
      }
    );
  }

  function handleClearApiKey(provider: LLMProvider) {
    clearApiKeyMutation.mutate({ provider });
  }

  function handleSetDefault(provider: LLMProvider) {
    setDefaultMutation.mutate({ provider });
    defaultProvider = provider;
  }

  function handleFeatureConfigChange(feature: string, config: LLMFeatureConfig) {
    featureModes[feature] = config;
    updateFeatureModesMutation.mutate({ [feature]: config });
  }

  // Provider metadata
  const providerMeta = {
    openai: { title: "OpenAI", description: "GPT-4 and GPT-3.5 models", icon: Bot },
    anthropic: { title: "Claude", description: "Anthropic's Claude models", icon: Sparkles },
    google: { title: "Gemini", description: "Google's Gemini models", icon: BrainCircuit },
    ollama: { title: "Ollama", description: "Local open-source models", icon: Bot },
  };

  // Build provider options for feature mode dropdown
  const providerOptions = $derived(
    (["openai", "anthropic", "google", "ollama"] as LLMProvider[]).map((p) => ({
      value: p,
      label: providerMeta[p].title,
      enabled: providerConfigs[p].enabled,
    }))
  );

  // Feature metadata
  const featureMeta = {
    transactionParsing: {
      title: "Transaction Parsing",
      description: "Parse and categorize transactions from imports",
      icon: FileText,
    },
    categorySuggestion: {
      title: "Category Suggestion",
      description: "Suggest categories for new transactions",
      icon: Tags,
    },
    anomalyDetection: {
      title: "Anomaly Detection",
      description: "Detect unusual spending patterns",
      icon: AlertTriangle,
    },
    forecasting: {
      title: "Forecasting",
      description: "Predict future spending and cash flow",
      icon: TrendingUp,
    },
    payeeMatching: {
      title: "Payee Matching",
      description: "Match and canonicalize merchant names",
      icon: FolderSearch,
    },
  };
</script>

<svelte:head>
  <title>LLM Providers - Settings - Budget App</title>
  <meta name="description" content="Configure LLM providers for AI-powered features" />
</svelte:head>

<div class="space-y-6" data-help-id="settings-llm" data-help-title="LLM Provider Settings">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">LLM Providers</h2>
      <p class="text-muted-foreground text-sm">
        Configure AI providers to enhance or replace ML features
      </p>
    </div>
  </div>

  {#if preferencesQuery.isLoading}
    <div class="space-y-4">
      <Skeleton class="h-[100px] w-full" />
      <Skeleton class="h-[300px] w-full" />
      <Skeleton class="h-[300px] w-full" />
    </div>
  {:else if preferencesQuery.error}
    <Card.Root class="border-destructive">
      <Card.Content class="pt-6">
        <div class="text-destructive flex items-center gap-2">
          <AlertTriangle class="h-5 w-5" />
          <p>Failed to load LLM settings</p>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Master Toggle -->
    <Card.Root data-help-id="llm-master-toggle" data-help-title="LLM Features Toggle">
      <Card.Content class="flex items-center justify-between p-6">
        <div class="flex items-center gap-4">
          <div class="bg-primary/10 rounded-lg p-3">
            <Sparkles class="text-primary h-6 w-6" />
          </div>
          <div>
            <h3 class="font-semibold">LLM Features</h3>
            <p class="text-muted-foreground text-sm">
              Enable AI-powered enhancements using large language models
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={toggleMutation.isPending} />
      </Card.Content>
    </Card.Root>

    <!-- Providers -->
    <Card.Root data-help-id="llm-providers" data-help-title="LLM Providers">
      <Card.Header>
        <Card.Title>Providers</Card.Title>
        <Card.Description>Configure your AI providers. API keys are stored encrypted.</Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4 sm:grid-cols-2">
        {#each ["openai", "anthropic", "google", "ollama"] as provider}
          {@const meta = providerMeta[provider as LLMProvider]}
          {@const config = providerConfigs[provider as LLMProvider]}
          {@const serverConfig = preferencesQuery.data?.providers[provider as LLMProvider]}
          {@const models = provider === "ollama" ? ollamaModels : LLM_MODELS[provider as LLMProvider]}
          <div class="relative">
            <LLMProviderCard
              provider={provider as LLMProvider}
              title={meta.title}
              description={meta.description}
              icon={meta.icon}
              bind:enabled={config.enabled}
              bind:model={config.model}
              bind:endpoint={config.endpoint}
              hasApiKey={serverConfig?.hasApiKey ?? false}
              showEndpoint={provider === "ollama"}
              isDefault={defaultProvider === provider}
              disabled={!enabled}
              isTesting={testingProvider === provider}
              isSaving={savingProvider === provider}
              {models}
              onToggle={(val) => handleProviderToggle(provider as LLMProvider, val)}
              onModelChange={(val) => (config.model = val)}
              onApiKeyChange={(val) => (config.apiKey = val)}
              onEndpointChange={(val) => (config.endpoint = val)}
              onSave={() => handleProviderSave(provider as LLMProvider)}
              onTest={() => handleProviderTest(provider as LLMProvider)}
              onClearApiKey={() => handleClearApiKey(provider as LLMProvider)}
              onSetDefault={() => handleSetDefault(provider as LLMProvider)}
            />
            {#if provider === "ollama" && config.enabled}
              <div class="mt-2 flex items-center justify-between text-xs">
                {#if ollamaModelsQuery.isLoading}
                  <span class="text-muted-foreground">Loading models...</span>
                {:else if ollamaModelsQuery.data?.error}
                  <span class="text-destructive">{ollamaModelsQuery.data.error}</span>
                {:else if ollamaModelsQuery.data?.success}
                  <span class="text-muted-foreground">
                    {ollamaModelsQuery.data.models.length} model{ollamaModelsQuery.data.models.length === 1 ? "" : "s"} found
                  </span>
                {/if}
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-6 px-2"
                  onclick={() => ollamaModelsQuery.refetch()}
                  disabled={ollamaModelsQuery.isFetching}
                >
                  <RefreshCw class="mr-1 h-3 w-3 {ollamaModelsQuery.isFetching ? 'animate-spin' : ''}" />
                  Refresh
                </Button>
              </div>
            {/if}
          </div>
        {/each}
      </Card.Content>
    </Card.Root>

    <!-- Feature Modes -->
    <Card.Root data-help-id="llm-feature-modes" data-help-title="LLM Feature Modes">
      <Card.Header>
        <Card.Title>Feature Modes</Card.Title>
        <Card.Description>
          Choose how LLM should work with each feature. "Enhance" uses LLM alongside ML, "Override" replaces ML
          entirely.
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4">
        {#each Object.entries(featureMeta) as [feature, meta]}
          <LLMFeatureMode
            title={meta.title}
            description={meta.description}
            icon={meta.icon}
            bind:config={featureModes[feature]}
            {defaultProvider}
            providers={providerOptions}
            disabled={!enabled}
            onConfigChange={(config) => handleFeatureConfigChange(feature, config)}
          />
        {/each}
      </Card.Content>
    </Card.Root>

    <!-- Info Card -->
    {#if !defaultProvider && enabled}
      <Card.Root class="border-warning bg-warning/5">
        <Card.Content class="flex items-start gap-3 pt-6">
          <AlertTriangle class="text-warning h-5 w-5 shrink-0" />
          <div>
            <p class="text-sm font-medium">No default provider set</p>
            <p class="text-muted-foreground text-xs">
              Enable a provider and set it as default to use LLM features.
            </p>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>
