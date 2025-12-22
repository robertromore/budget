<script lang="ts">
  import { MLFeatureToggle } from "$lib/components/ml";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Slider } from "$lib/components/ui/slider";
  import { Switch } from "$lib/components/ui/switch";
  import { IntelligenceInputSettings } from "$lib/query/intelligence-input-settings";
  import { MLSettings } from "$lib/query/ml-settings";
  import { WebSearchSettings } from "$lib/query/web-search-settings";
  import type { DuplicateDetectionMethod, IntelligenceInputPreferences, WebSearchProvider } from "$lib/schema/workspaces";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Brain from "@lucide/svelte/icons/brain";
  import Check from "@lucide/svelte/icons/check";
  import Eye from "@lucide/svelte/icons/eye";
  import Globe from "@lucide/svelte/icons/globe";
  import Save from "@lucide/svelte/icons/save";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Users from "@lucide/svelte/icons/users";
  import Wand from "@lucide/svelte/icons/wand";
  import Zap from "@lucide/svelte/icons/zap";

  // ML Queries - use .options() for reactive interface
  const preferencesQuery = MLSettings.getPreferences().options();

  // ML Mutations - use .options() for reactive interface
  const updateMutation = MLSettings.update().options();
  const toggleMutation = MLSettings.toggle().options();

  // Web Search Queries
  const webSearchQuery = WebSearchSettings.getPreferences().options();

  // Web Search Mutations
  const webSearchUpdateMutation = WebSearchSettings.update().options();
  const webSearchToggleMutation = WebSearchSettings.toggle().options();

  // Intelligence Input Queries
  const intelligenceInputQuery = IntelligenceInputSettings.getPreferences().options();

  // Intelligence Input Mutations
  const intelligenceInputUpdateMutation = IntelligenceInputSettings.update().options();
  const intelligenceInputToggleMutation = IntelligenceInputSettings.toggle().options();

  // Local state for ML form
  let enabled = $state(true);
  let features = $state({
    forecasting: true,
    anomalyDetection: true,
    similarity: true,
    userBehavior: true,
  });
  let config = $state({
    anomalySensitivity: "medium" as "low" | "medium" | "high",
    forecastHorizon: 30,
    similarityThreshold: 0.6,
  });
  let duplicateDetection = $state({
    defaultMethod: "ml" as DuplicateDetectionMethod,
  });

  // Local state for Web Search form
  let webSearchEnabled = $state(true);
  let webSearchProvider = $state<WebSearchProvider>("duckduckgo");
  let braveApiKey = $state("");
  let ollamaCloudApiKey = $state("");
  let hasBraveApiKey = $state(false);
  let hasOllamaCloudApiKey = $state(false);

  // Local state for Intelligence Input form
  let intelligenceInputEnabled = $state(true);
  let showInHeader = $state(true);
  let defaultMode = $state<IntelligenceInputPreferences["defaultMode"]>("auto");

  // Sync ML with query data
  $effect(() => {
    if (preferencesQuery.data) {
      enabled = preferencesQuery.data.enabled;
      features = { ...preferencesQuery.data.features };
      config = { ...preferencesQuery.data.config };
      duplicateDetection = { ...preferencesQuery.data.duplicateDetection };
    }
  });

  // Sync Web Search with query data
  $effect(() => {
    if (webSearchQuery.data) {
      webSearchEnabled = webSearchQuery.data.enabled;
      webSearchProvider = webSearchQuery.data.provider;
      hasBraveApiKey = webSearchQuery.data.hasBraveApiKey;
      hasOllamaCloudApiKey = webSearchQuery.data.hasOllamaCloudApiKey;
    }
  });

  // Sync Intelligence Input with query data
  $effect(() => {
    if (intelligenceInputQuery.data) {
      intelligenceInputEnabled = intelligenceInputQuery.data.enabled;
      showInHeader = intelligenceInputQuery.data.showInHeader;
      defaultMode = intelligenceInputQuery.data.defaultMode;
    }
  });

  function handleToggle() {
    toggleMutation.mutate({ enabled: !enabled });
    enabled = !enabled;
  }

  function handleSave() {
    updateMutation.mutate({
      enabled,
      features,
      config,
      duplicateDetection,
    });
  }

  function handleWebSearchToggle() {
    webSearchToggleMutation.mutate({ enabled: !webSearchEnabled });
    webSearchEnabled = !webSearchEnabled;
  }

  function handleWebSearchSave() {
    webSearchUpdateMutation.mutate({
      enabled: webSearchEnabled,
      provider: webSearchProvider,
      braveApiKey: braveApiKey || undefined,
      ollamaCloudApiKey: ollamaCloudApiKey || undefined,
    });
    // Clear the input fields after save
    braveApiKey = "";
    ollamaCloudApiKey = "";
  }

  function handleIntelligenceInputToggle() {
    intelligenceInputToggleMutation.mutate({ enabled: !intelligenceInputEnabled });
    intelligenceInputEnabled = !intelligenceInputEnabled;
  }

  function handleIntelligenceInputSave() {
    intelligenceInputUpdateMutation.mutate({
      enabled: intelligenceInputEnabled,
      showInHeader,
      defaultMode,
    });
  }

  const hasChanges = $derived(() => {
    if (!preferencesQuery.data) return false;
    return (
      enabled !== preferencesQuery.data.enabled ||
      JSON.stringify(features) !== JSON.stringify(preferencesQuery.data.features) ||
      JSON.stringify(config) !== JSON.stringify(preferencesQuery.data.config) ||
      JSON.stringify(duplicateDetection) !== JSON.stringify(preferencesQuery.data.duplicateDetection)
    );
  });

  const hasWebSearchChanges = $derived(() => {
    if (!webSearchQuery.data) return false;
    return (
      webSearchEnabled !== webSearchQuery.data.enabled ||
      webSearchProvider !== webSearchQuery.data.provider ||
      braveApiKey.length > 0 ||
      ollamaCloudApiKey.length > 0
    );
  });

  const hasIntelligenceInputChanges = $derived(() => {
    if (!intelligenceInputQuery.data) return false;
    return (
      intelligenceInputEnabled !== intelligenceInputQuery.data.enabled ||
      showInHeader !== intelligenceInputQuery.data.showInHeader ||
      defaultMode !== intelligenceInputQuery.data.defaultMode
    );
  });
</script>

<svelte:head>
  <title>ML Settings - Settings - Budget App</title>
  <meta name="description" content="Configure machine learning features" />
</svelte:head>

<div class="space-y-6" data-help-id="settings-ml" data-help-title="Machine Learning Settings">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">Machine Learning</h2>
      <p class="text-muted-foreground text-sm">Configure ML-powered features and preferences</p>
    </div>
    <Button
      onclick={handleSave}
      disabled={!hasChanges() || updateMutation.isPending}
    >
      <Save class="mr-2 h-4 w-4" />
      Save Changes
    </Button>
  </div>

  {#if preferencesQuery.isLoading}
    <div class="space-y-4">
      <Skeleton class="h-[100px] w-full" />
      <Skeleton class="h-[300px] w-full" />
      <Skeleton class="h-[200px] w-full" />
    </div>
  {:else if preferencesQuery.error}
    <Card.Root class="border-destructive">
      <Card.Content class="pt-6">
        <div class="flex items-center gap-2 text-destructive">
          <AlertTriangle class="h-5 w-5" />
          <p>Failed to load ML settings</p>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Master Toggle -->
    <Card.Root data-help-id="ml-master-toggle" data-help-title="ML Features Toggle">
      <Card.Content class="flex items-center justify-between p-6">
        <div class="flex items-center gap-4">
          <div class="bg-primary/10 rounded-lg p-3">
            <Brain class="text-primary h-6 w-6" />
          </div>
          <div>
            <h3 class="font-semibold">Machine Learning Features</h3>
            <p class="text-muted-foreground text-sm">
              Enable or disable all ML-powered features
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending}
        />
      </Card.Content>
    </Card.Root>

    <!-- Feature Toggles -->
    <Card.Root data-help-id="ml-features" data-help-title="ML Feature Toggles">
      <Card.Header>
        <Card.Title>Features</Card.Title>
        <Card.Description>
          Choose which ML features to enable for your workspace
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4 sm:grid-cols-2">
        <MLFeatureToggle
          title="Forecasting"
          description="Cash flow predictions and spending projections"
          bind:enabled={features.forecasting}
          disabled={!enabled}
          icon={TrendingUp}
        />
        <MLFeatureToggle
          title="Anomaly Detection"
          description="Detect unusual transactions and patterns"
          bind:enabled={features.anomalyDetection}
          disabled={!enabled}
          icon={AlertTriangle}
        />
        <MLFeatureToggle
          title="Similarity Matching"
          description="Smart payee matching and canonicalization"
          bind:enabled={features.similarity}
          disabled={!enabled}
          icon={Eye}
        />
        <MLFeatureToggle
          title="User Behavior"
          description="Personalized recommendations and learning"
          bind:enabled={features.userBehavior}
          disabled={!enabled}
          icon={Users}
        />
      </Card.Content>
    </Card.Root>

    <!-- Configuration -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Configuration</Card.Title>
        <Card.Description>
          Fine-tune ML feature behavior
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Anomaly Sensitivity -->
        <div class="space-y-3" data-help-id="ml-anomaly-sensitivity" data-help-title="Anomaly Sensitivity">
          <Label>Anomaly Detection Sensitivity</Label>
          <RadioGroup.Root
            value={config.anomalySensitivity}
            onValueChange={(v) => {
              if (v) config.anomalySensitivity = v as typeof config.anomalySensitivity;
            }}
            disabled={!enabled || !features.anomalyDetection}
            class="flex gap-4"
          >
            <div class="flex items-center space-x-2">
              <RadioGroup.Item value="low" id="sens-low" />
              <Label for="sens-low" class="font-normal">Low</Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroup.Item value="medium" id="sens-medium" />
              <Label for="sens-medium" class="font-normal">Medium</Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroup.Item value="high" id="sens-high" />
              <Label for="sens-high" class="font-normal">High</Label>
            </div>
          </RadioGroup.Root>
          <p class="text-muted-foreground text-xs">
            Higher sensitivity detects more anomalies but may have more false positives.
          </p>
        </div>

        <!-- Forecast Horizon -->
        <div class="space-y-3" data-help-id="ml-forecast-horizon" data-help-title="Forecast Horizon">
          <div class="flex items-center justify-between">
            <Label>Default Forecast Horizon</Label>
            <span class="text-muted-foreground text-sm">{config.forecastHorizon} days</span>
          </div>
          <Slider
            type="single"
            value={config.forecastHorizon}
            onValueChange={(v) => {
              config.forecastHorizon = v;
            }}
            min={7}
            max={365}
            step={1}
            disabled={!enabled || !features.forecasting}
            class="w-full"
          />
          <p class="text-muted-foreground text-xs">
            How far ahead to predict by default (7-365 days).
          </p>
        </div>

        <!-- Similarity Threshold -->
        <div class="space-y-3" data-help-id="ml-similarity-threshold" data-help-title="Similarity Threshold">
          <div class="flex items-center justify-between">
            <Label>Similarity Threshold</Label>
            <span class="text-muted-foreground text-sm">
              {(config.similarityThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            type="single"
            value={config.similarityThreshold}
            onValueChange={(v) => {
              config.similarityThreshold = v;
            }}
            min={0}
            max={1}
            step={0.05}
            disabled={!enabled || !features.similarity}
            class="w-full"
          />
          <p class="text-muted-foreground text-xs">
            Minimum similarity score required for payee matching (0-100%).
          </p>
        </div>

        <!-- Duplicate Detection Method -->
        <div class="space-y-3" data-help-id="ml-duplicate-detection" data-help-title="Duplicate Detection Method">
          <Label>Default Duplicate Detection Method</Label>
          <RadioGroup.Root
            value={duplicateDetection.defaultMethod}
            onValueChange={(v) => {
              if (v) duplicateDetection.defaultMethod = v as DuplicateDetectionMethod;
            }}
            disabled={!enabled || !features.similarity}
            class="grid gap-3"
          >
            <div class="flex items-start space-x-3 rounded-lg border p-3">
              <RadioGroup.Item value="simple" id="detect-simple" class="mt-1" />
              <div class="flex-1">
                <Label for="detect-simple" class="font-medium cursor-pointer flex items-center gap-2">
                  <Zap class="h-4 w-4 text-yellow-500" />
                  Simple
                </Label>
                <p class="text-muted-foreground text-sm mt-0.5">
                  Basic text matching using Levenshtein distance (fastest)
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-3 rounded-lg border p-3">
              <RadioGroup.Item value="ml" id="detect-ml" class="mt-1" />
              <div class="flex-1">
                <Label for="detect-ml" class="font-medium cursor-pointer flex items-center gap-2">
                  <Brain class="h-4 w-4 text-primary" />
                  Machine Learning
                  <span class="text-xs text-muted-foreground font-normal">(Recommended)</span>
                </Label>
                <p class="text-muted-foreground text-sm mt-0.5">
                  Pattern-aware matching that handles order IDs and store numbers
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-3 rounded-lg border p-3">
              <RadioGroup.Item value="llm" id="detect-llm" class="mt-1" />
              <div class="flex-1">
                <Label for="detect-llm" class="font-medium cursor-pointer flex items-center gap-2">
                  <Sparkles class="h-4 w-4 text-violet-500" />
                  AI + ML Filter
                </Label>
                <p class="text-muted-foreground text-sm mt-0.5">
                  ML finds candidates above threshold, AI confirms matches
                </p>
              </div>
            </div>

            <div class="flex items-start space-x-3 rounded-lg border p-3">
              <RadioGroup.Item value="llm_direct" id="detect-llm-direct" class="mt-1" />
              <div class="flex-1">
                <Label for="detect-llm-direct" class="font-medium cursor-pointer flex items-center gap-2">
                  <Sparkles class="h-4 w-4 text-violet-500" />
                  AI Direct
                </Label>
                <p class="text-muted-foreground text-sm mt-0.5">
                  AI analyzes all payee pairs directly (bypasses threshold)
                </p>
              </div>
            </div>
          </RadioGroup.Root>
          <p class="text-muted-foreground text-xs">
            Can be overridden per-scan in the Payees → Cleanup page.
          </p>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Web Search Section -->
  <div class="mt-8 border-t pt-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold">Contact Enrichment</h2>
        <p class="text-muted-foreground text-sm">
          Configure web search for enriching payee contact information
        </p>
      </div>
      <Button
        onclick={handleWebSearchSave}
        disabled={!hasWebSearchChanges() || webSearchUpdateMutation.isPending}
      >
        <Save class="mr-2 h-4 w-4" />
        Save Changes
      </Button>
    </div>

    {#if webSearchQuery.isLoading}
      <div class="space-y-4">
        <Skeleton class="h-[100px] w-full" />
        <Skeleton class="h-[200px] w-full" />
      </div>
    {:else if webSearchQuery.error}
      <Card.Root class="border-destructive">
        <Card.Content class="pt-6">
          <div class="flex items-center gap-2 text-destructive">
            <AlertTriangle class="h-5 w-5" />
            <p>Failed to load web search settings</p>
          </div>
        </Card.Content>
      </Card.Root>
    {:else}
      <!-- Master Toggle -->
      <Card.Root data-help-id="ml-web-search" data-help-title="Web Search Enrichment">
        <Card.Content class="flex items-center justify-between p-6">
          <div class="flex items-center gap-4">
            <div class="bg-primary/10 rounded-lg p-3">
              <Globe class="text-primary h-6 w-6" />
            </div>
            <div>
              <h3 class="font-semibold">Web Search Enrichment</h3>
              <p class="text-muted-foreground text-sm">
                Search the web to find contact details for payees
              </p>
            </div>
          </div>
          <Switch
            checked={webSearchEnabled}
            onCheckedChange={handleWebSearchToggle}
            disabled={webSearchToggleMutation.isPending}
          />
        </Card.Content>
      </Card.Root>

      <!-- Search Provider Configuration -->
      <Card.Root class="mt-4" data-help-id="ml-web-search-provider" data-help-title="Search Provider">
        <Card.Header>
          <Card.Title>Search Provider</Card.Title>
          <Card.Description>
            Choose which search provider to use for contact enrichment
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
          <!-- Provider Selection -->
          <RadioGroup.Root
            value={webSearchProvider}
            onValueChange={(v) => {
              if (v) webSearchProvider = v as WebSearchProvider;
            }}
            disabled={!webSearchEnabled}
            class="grid gap-4"
          >
            <!-- DuckDuckGo -->
            <div class="flex items-start space-x-3 rounded-lg border p-4">
              <RadioGroup.Item value="duckduckgo" id="provider-ddg" class="mt-1" />
              <div class="flex-1">
                <Label for="provider-ddg" class="font-medium cursor-pointer">
                  DuckDuckGo
                </Label>
                <p class="text-muted-foreground text-sm mt-1">
                  Free, no API key required. Uses HTML scraping.
                </p>
              </div>
            </div>

            <!-- Brave Search -->
            <div class="flex items-start space-x-3 rounded-lg border p-4">
              <RadioGroup.Item value="brave" id="provider-brave" class="mt-1" />
              <div class="flex-1 space-y-3">
                <div>
                  <Label for="provider-brave" class="font-medium cursor-pointer">
                    Brave Search API
                  </Label>
                  <p class="text-muted-foreground text-sm mt-1">
                    Reliable API with 2,000 free queries/month. Requires API key.
                  </p>
                </div>
                {#if webSearchProvider === "brave"}
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <Label for="brave-key" class="text-sm">API Key</Label>
                      {#if hasBraveApiKey}
                        <span class="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Check class="h-3 w-3" />
                          Configured
                        </span>
                      {/if}
                    </div>
                    <Input
                      id="brave-key"
                      type="password"
                      placeholder={hasBraveApiKey ? "••••••••" : "Enter Brave API key"}
                      bind:value={braveApiKey}
                      disabled={!webSearchEnabled}
                    />
                    <p class="text-muted-foreground text-xs">
                      Get your API key at <a
                        href="https://brave.com/search/api/"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="underline hover:text-foreground"
                      >brave.com/search/api</a>
                    </p>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Ollama Web Search -->
            <div class="flex items-start space-x-3 rounded-lg border p-4">
              <RadioGroup.Item value="ollama" id="provider-ollama" class="mt-1" />
              <div class="flex-1 space-y-3">
                <div>
                  <Label for="provider-ollama" class="font-medium cursor-pointer">
                    Ollama Web Search
                  </Label>
                  <p class="text-muted-foreground text-sm mt-1">
                    Cloud-based web search from Ollama. Requires API key.
                  </p>
                </div>
                {#if webSearchProvider === "ollama"}
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <Label for="ollama-key" class="text-sm">API Key</Label>
                      {#if hasOllamaCloudApiKey}
                        <span class="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Check class="h-3 w-3" />
                          Configured
                        </span>
                      {/if}
                    </div>
                    <Input
                      id="ollama-key"
                      type="password"
                      placeholder={hasOllamaCloudApiKey ? "••••••••" : "Enter Ollama API key"}
                      bind:value={ollamaCloudApiKey}
                      disabled={!webSearchEnabled}
                    />
                    <p class="text-muted-foreground text-xs">
                      Get your API key from your Ollama cloud account.
                    </p>
                  </div>
                {/if}
              </div>
            </div>
          </RadioGroup.Root>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>

  <!-- Intelligence Input Mode Section -->
  <div class="mt-8 border-t pt-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold">Intelligence Input Mode</h2>
        <p class="text-muted-foreground text-sm">
          Overlay mode that highlights fields with intelligence capabilities
        </p>
      </div>
      <Button
        onclick={handleIntelligenceInputSave}
        disabled={!hasIntelligenceInputChanges() || intelligenceInputUpdateMutation.isPending}
      >
        <Save class="mr-2 h-4 w-4" />
        Save Changes
      </Button>
    </div>

    {#if intelligenceInputQuery.isLoading}
      <div class="space-y-4">
        <Skeleton class="h-[100px] w-full" />
        <Skeleton class="h-[200px] w-full" />
      </div>
    {:else if intelligenceInputQuery.error}
      <Card.Root class="border-destructive">
        <Card.Content class="pt-6">
          <div class="flex items-center gap-2 text-destructive">
            <AlertTriangle class="h-5 w-5" />
            <p>Failed to load intelligence input settings</p>
          </div>
        </Card.Content>
      </Card.Root>
    {:else}
      <!-- Master Toggle -->
      <Card.Root data-help-id="ml-intelligence-input" data-help-title="Intelligence Input Mode">
        <Card.Content class="flex items-center justify-between p-6">
          <div class="flex items-center gap-4">
            <div class="bg-violet-500/10 rounded-lg p-3">
              <Wand class="text-violet-500 h-6 w-6" />
            </div>
            <div>
              <h3 class="font-semibold">Intelligence Input Mode</h3>
              <p class="text-muted-foreground text-sm">
                Activate with <kbd class="px-1.5 py-0.5 text-xs rounded border bg-muted">⌘/Ctrl+Shift+I</kbd> to highlight form fields with ML/LLM capabilities
              </p>
            </div>
          </div>
          <Switch
            checked={intelligenceInputEnabled}
            onCheckedChange={handleIntelligenceInputToggle}
            disabled={intelligenceInputToggleMutation.isPending}
          />
        </Card.Content>
      </Card.Root>

      <!-- Configuration -->
      <Card.Root class="mt-4">
        <Card.Header>
          <Card.Title>Configuration</Card.Title>
          <Card.Description>
            Customize how intelligence input mode behaves
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-6">
          <!-- Show in Header -->
          <div class="flex items-center justify-between">
            <div class="space-y-0.5">
              <Label>Show in Header</Label>
              <p class="text-muted-foreground text-xs">
                Display intelligence input mode button in the app header
              </p>
            </div>
            <Switch
              checked={showInHeader}
              onCheckedChange={(v) => (showInHeader = v)}
              disabled={!intelligenceInputEnabled}
            />
          </div>

          <!-- Default Mode -->
          <div class="space-y-3" data-help-id="ml-intelligence-input-mode" data-help-title="Default Mode">
            <Label>Default Mode</Label>
            <RadioGroup.Root
              value={defaultMode}
              onValueChange={(v) => {
                if (v) defaultMode = v as typeof defaultMode;
              }}
              disabled={!intelligenceInputEnabled}
              class="grid gap-3"
            >
              <div class="flex items-start space-x-3 rounded-lg border p-3">
                <RadioGroup.Item value="auto" id="mode-auto" class="mt-1" />
                <div class="flex-1">
                  <Label for="mode-auto" class="font-medium cursor-pointer flex items-center gap-2">
                    Auto
                    <span class="text-xs text-muted-foreground font-normal">(Recommended)</span>
                  </Label>
                  <p class="text-muted-foreground text-sm mt-0.5">
                    Uses last-used mode per field, or ML for new fields
                  </p>
                </div>
              </div>

              <div class="flex items-start space-x-3 rounded-lg border p-3">
                <RadioGroup.Item value="ml" id="mode-ml" class="mt-1" />
                <div class="flex-1">
                  <Label for="mode-ml" class="font-medium cursor-pointer flex items-center gap-2">
                    <Brain class="h-4 w-4 text-primary" />
                    ML Only
                  </Label>
                  <p class="text-muted-foreground text-sm mt-0.5">
                    Always use local machine learning for suggestions
                  </p>
                </div>
              </div>

              <div class="flex items-start space-x-3 rounded-lg border p-3">
                <RadioGroup.Item value="llm" id="mode-llm" class="mt-1" />
                <div class="flex-1">
                  <Label for="mode-llm" class="font-medium cursor-pointer flex items-center gap-2">
                    <Sparkles class="h-4 w-4 text-violet-500" />
                    LLM Only
                  </Label>
                  <p class="text-muted-foreground text-sm mt-0.5">
                    Always use language models for richer suggestions
                  </p>
                </div>
              </div>
            </RadioGroup.Root>
            <p class="text-muted-foreground text-xs">
              You can always change the mode per-field by pressing <kbd class="px-1 py-0.5 text-xs rounded border bg-muted">M</kbd> or <kbd class="px-1 py-0.5 text-xs rounded border bg-muted">L</kbd> while a field is highlighted.
            </p>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  </div>
</div>
