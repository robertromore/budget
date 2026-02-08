<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Label } from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Switch } from "$lib/components/ui/switch";
  import { DocumentExtraction } from "$lib/query/document-extraction";
  import { LLMSettings } from "$lib/query/llm-settings";
  import type { DocumentExtractionMethod, LLMProvider } from "$lib/schema/workspaces";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Bot from "@lucide/svelte/icons/bot";
  import Eye from "@lucide/svelte/icons/eye";
  import FileText from "@lucide/svelte/icons/file-text";
  import ScanText from "@lucide/svelte/icons/scan-text";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Wand2 from "@lucide/svelte/icons/wand-2";

  // Queries
  const preferencesQuery = DocumentExtraction.getPreferences().options();
  const languagesQuery = DocumentExtraction.getLanguages().options();
  const llmPreferencesQuery = LLMSettings.getPreferences().options();

  // Mutations
  const toggleMutation = DocumentExtraction.toggle().options();
  const updateMutation = DocumentExtraction.updatePreferences().options();

  // Local state
  let enabled = $state(true);
  let method = $state<DocumentExtractionMethod>("auto");
  let autoExtractOnUpload = $state(true);
  let aiVisionProvider = $state<LLMProvider | null>(null);
  let fallbackToOcr = $state(true);
  let fallbackToAi = $state(false);
  let tesseractLanguage = $state("eng");

  // Method metadata for display
  const methodMeta: Record<DocumentExtractionMethod, { title: string; description: string; icon: typeof FileText }> = {
    auto: {
      title: "Auto",
      description: "Automatically selects the best method based on file type",
      icon: Wand2,
    },
    "pdf-parse": {
      title: "PDF Parse",
      description: "Fast extraction for text-based PDFs (free)",
      icon: FileText,
    },
    tesseract: {
      title: "Tesseract OCR",
      description: "OCR for images and scanned documents (free, slower)",
      icon: ScanText,
    },
    "ai-vision": {
      title: "AI Vision",
      description: "Uses LLM vision models for high accuracy (requires API key)",
      icon: Eye,
    },
  };

  // Language labels as fallback
  const languageLabels: Record<string, string> = {
    eng: "English",
    spa: "Spanish",
    fra: "French",
    deu: "German",
    ita: "Italian",
    por: "Portuguese",
    chi_sim: "Chinese (Simplified)",
    chi_tra: "Chinese (Traditional)",
    jpn: "Japanese",
    kor: "Korean",
    ara: "Arabic",
    rus: "Russian",
  };

  // Sync with query data
  $effect(() => {
    if (preferencesQuery.data) {
      enabled = preferencesQuery.data.enabled;
      method = preferencesQuery.data.method;
      autoExtractOnUpload = preferencesQuery.data.autoExtractOnUpload;
      aiVisionProvider = preferencesQuery.data.aiVisionProvider;
      fallbackToOcr = preferencesQuery.data.fallbackToOcr;
      fallbackToAi = preferencesQuery.data.fallbackToAi;
      tesseractLanguage = preferencesQuery.data.tesseractLanguage;
    }
  });

  // Get enabled LLM providers for AI Vision selection
  const enabledProviders = $derived.by(() => {
    if (!llmPreferencesQuery.data) return [];
    const providers: Array<{ value: LLMProvider; label: string }> = [];
    const providerMeta: Record<LLMProvider, string> = {
      openai: "OpenAI (GPT-4 Vision)",
      anthropic: "Claude (Claude 3+)",
      google: "Google (Gemini)",
      ollama: "Ollama (Local)",
    };
    for (const [key, config] of Object.entries(llmPreferencesQuery.data.providers)) {
      if (config.enabled) {
        providers.push({
          value: key as LLMProvider,
          label: providerMeta[key as LLMProvider],
        });
      }
    }
    return providers;
  });

  // Check if LLM is configured
  const hasLlmConfigured = $derived(
    llmPreferencesQuery.data?.enabled && enabledProviders.length > 0
  );

  // Get display label for selected provider
  const selectedProviderLabel = $derived.by(() => {
    if (!aiVisionProvider) return "Use Default Provider";
    const provider = enabledProviders.find((p) => p.value === aiVisionProvider);
    return provider?.label ?? aiVisionProvider;
  });

  // Get display label for selected language
  const selectedLanguageLabel = $derived.by(() => {
    if (languagesQuery.data) {
      const lang = languagesQuery.data.find((l) => l.code === tesseractLanguage);
      return lang?.name ?? tesseractLanguage;
    }
    return languageLabels[tesseractLanguage] ?? tesseractLanguage;
  });

  function handleToggle() {
    toggleMutation.mutate({ enabled: !enabled });
    enabled = !enabled;
  }

  function handleMethodChange(newMethod: DocumentExtractionMethod) {
    method = newMethod;
    updateMutation.mutate({ method: newMethod });
  }

  function handleAutoExtractChange(val: boolean) {
    autoExtractOnUpload = val;
    updateMutation.mutate({ autoExtractOnUpload: val });
  }

  function handleAiProviderChange(val: string) {
    const provider = val === "default" ? null : (val as LLMProvider);
    aiVisionProvider = provider;
    updateMutation.mutate({ aiVisionProvider: provider });
  }

  function handleFallbackToOcrChange(val: boolean) {
    fallbackToOcr = val;
    updateMutation.mutate({ fallbackToOcr: val });
  }

  function handleFallbackToAiChange(val: boolean) {
    fallbackToAi = val;
    updateMutation.mutate({ fallbackToAi: val });
  }

  function handleLanguageChange(lang: string) {
    tesseractLanguage = lang;
    updateMutation.mutate({ tesseractLanguage: lang });
  }

</script>

<svelte:head>
  <title>Document Extraction - Settings - Budget App</title>
  <meta name="description" content="Configure document text extraction settings" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold">Document Text Extraction</h2>
      <p class="text-muted-foreground text-sm">
        Configure how text is extracted from uploaded documents
      </p>
    </div>
  </div>

  {#if preferencesQuery.isLoading}
    <div class="space-y-4">
      <Skeleton class="h-25 w-full" />
      <Skeleton class="h-50 w-full" />
      <Skeleton class="h-40 w-full" />
    </div>
  {:else if preferencesQuery.error}
    <Card.Root class="border-destructive">
      <Card.Content class="pt-6">
        <div class="text-destructive flex items-center gap-2">
          <AlertTriangle class="h-5 w-5" />
          <p>Failed to load extraction settings</p>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Master Toggle -->
    <Card.Root>
      <Card.Content class="flex items-center justify-between p-6">
        <div class="flex items-center gap-4">
          <div class="bg-primary/10 rounded-lg p-3">
            <FileText class="text-primary h-6 w-6" />
          </div>
          <div>
            <h3 class="font-semibold">Document Extraction</h3>
            <p class="text-muted-foreground text-sm">
              Extract text from uploaded documents for AI analysis
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={toggleMutation.isPending} />
      </Card.Content>
    </Card.Root>

    <!-- Extraction Method -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Extraction Method</Card.Title>
        <Card.Description>
          Choose how text should be extracted from documents
        </Card.Description>
      </Card.Header>
      <Card.Content class="grid gap-4 sm:grid-cols-2">
        {#each Object.entries(methodMeta) as [key, meta]}
          {@const Icon = meta.icon}
          {@const isSelected = method === key}
          {@const isAiMethod = key === "ai-vision"}
          {@const isDisabled = !enabled || (isAiMethod && !hasLlmConfigured)}
          <button
            type="button"
            class="relative flex cursor-pointer flex-col gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50 {isSelected ? 'border-primary bg-primary/5' : ''} {isDisabled ? 'opacity-50 cursor-not-allowed' : ''}"
            disabled={isDisabled}
            onclick={() => !isDisabled && handleMethodChange(key as DocumentExtractionMethod)}
          >
            <div class="flex items-center gap-3">
              <div class="rounded-lg p-2 {isSelected ? 'bg-primary/10' : 'bg-muted'}">
                <Icon class="h-5 w-5 {isSelected ? 'text-primary' : ''}" />
              </div>
              <div class="flex-1">
                <div class="font-medium">{meta.title}</div>
                <div class="text-muted-foreground text-xs">{meta.description}</div>
              </div>
              {#if isSelected}
                <div class="bg-primary h-2 w-2 rounded-full"></div>
              {/if}
            </div>
            {#if isAiMethod && !hasLlmConfigured}
              <div class="text-warning text-xs">
                Configure LLM providers in Settings, Intelligence, LLM Providers
              </div>
            {/if}
          </button>
        {/each}
      </Card.Content>
    </Card.Root>

    <!-- Auto Extract Setting -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Upload Behavior</Card.Title>
        <Card.Description>
          Configure automatic extraction when documents are uploaded
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="flex items-center justify-between">
          <div>
            <Label class="font-medium">Auto-extract on upload</Label>
            <p class="text-muted-foreground text-xs">
              Automatically extract text when documents are uploaded
            </p>
          </div>
          <Switch
            checked={autoExtractOnUpload}
            onCheckedChange={handleAutoExtractChange}
            disabled={!enabled || updateMutation.isPending}
          />
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Fallback Options -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Fallback Options</Card.Title>
        <Card.Description>
          Configure fallback methods when primary extraction fails or produces poor results
        </Card.Description>
      </Card.Header>
      <Card.Content class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <Label class="font-medium">Fallback to OCR</Label>
            <p class="text-muted-foreground text-xs">
              If PDF parsing fails or text is minimal, try OCR extraction
            </p>
          </div>
          <Switch
            checked={fallbackToOcr}
            onCheckedChange={handleFallbackToOcrChange}
            disabled={!enabled || updateMutation.isPending}
          />
        </div>

        <div class="flex items-center justify-between">
          <div class="flex-1">
            <Label class="font-medium">Fallback to AI Vision</Label>
            <p class="text-muted-foreground text-xs">
              If other methods fail, use AI vision for extraction (incurs API costs)
            </p>
            {#if !hasLlmConfigured}
              <p class="text-warning mt-1 text-xs">
                Requires an LLM provider with vision support
              </p>
            {/if}
          </div>
          <Switch
            checked={fallbackToAi}
            onCheckedChange={handleFallbackToAiChange}
            disabled={!enabled || !hasLlmConfigured || updateMutation.isPending}
          />
        </div>
      </Card.Content>
    </Card.Root>

    <!-- AI Vision Provider -->
    {#if method === "ai-vision" || fallbackToAi}
      <Card.Root>
        <Card.Header>
          <Card.Title>AI Vision Provider</Card.Title>
          <Card.Description>
            Select which LLM provider to use for AI-based extraction
          </Card.Description>
        </Card.Header>
        <Card.Content>
          {#if enabledProviders.length === 0}
            <div class="bg-warning/10 text-warning rounded-lg p-4 text-sm">
              <div class="flex items-center gap-2">
                <AlertTriangle class="h-4 w-4" />
                <span>No LLM providers configured with vision support</span>
              </div>
              <p class="mt-2 text-xs">
                Configure a provider in Settings, Intelligence, LLM Providers
              </p>
            </div>
          {:else}
            <div class="space-y-4">
              <div class="flex items-center gap-4">
                <Label class="w-32">Provider</Label>
                <Select.Root
                  type="single"
                  value={aiVisionProvider ?? "default"}
                  onValueChange={handleAiProviderChange}
                >
                  <Select.Trigger class="w-64">
                    <span class="flex items-center gap-2">
                      {#if aiVisionProvider}
                        <Bot class="h-4 w-4" />
                      {:else}
                        <Sparkles class="h-4 w-4" />
                      {/if}
                      {selectedProviderLabel}
                    </span>
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="default">
                      <div class="flex items-center gap-2">
                        <Sparkles class="h-4 w-4" />
                        <span>Use Default Provider</span>
                      </div>
                    </Select.Item>
                    {#each enabledProviders as provider}
                      <Select.Item value={provider.value}>
                        <div class="flex items-center gap-2">
                          <Bot class="h-4 w-4" />
                          <span>{provider.label}</span>
                        </div>
                      </Select.Item>
                    {/each}
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- OCR Language -->
    {#if method === "tesseract" || method === "auto" || fallbackToOcr}
      <Card.Root>
        <Card.Header>
          <Card.Title>OCR Settings</Card.Title>
          <Card.Description>
            Configure Tesseract OCR language for text recognition
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="flex items-center gap-4">
            <Label class="w-32">Language</Label>
            <Select.Root
              type="single"
              value={tesseractLanguage}
              onValueChange={handleLanguageChange}
            >
              <Select.Trigger class="w-64">
                <span>{selectedLanguageLabel}</span>
              </Select.Trigger>
              <Select.Content>
                {#if languagesQuery.data}
                  {#each languagesQuery.data as lang}
                    <Select.Item value={lang.code}>{lang.name}</Select.Item>
                  {/each}
                {:else}
                  {#each Object.entries(languageLabels) as [code, label]}
                    <Select.Item value={code}>{label}</Select.Item>
                  {/each}
                {/if}
              </Select.Content>
            </Select.Root>
          </div>
          <p class="text-muted-foreground mt-2 text-xs">
            Tesseract downloads language data on first use. Non-English languages may take longer.
          </p>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Info Card -->
    <Card.Root class="border-muted bg-muted/30">
      <Card.Content class="flex items-start gap-3 pt-6">
        <FileText class="text-muted-foreground h-5 w-5 shrink-0" />
        <div class="text-muted-foreground text-sm">
          <p class="font-medium">How extraction works:</p>
          <ul class="mt-2 list-disc space-y-1 pl-4 text-xs">
            <li><strong>Auto mode</strong> uses PDF Parse for text-based PDFs, OCR for images</li>
            <li><strong>PDF Parse</strong> is fast and free but only works on text-based PDFs</li>
            <li><strong>Tesseract OCR</strong> handles scanned documents but is slower</li>
            <li><strong>AI Vision</strong> provides highest accuracy but incurs API costs</li>
          </ul>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
