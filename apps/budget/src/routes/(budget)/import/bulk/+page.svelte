<script lang="ts">
import * as Tabs from '$lib/components/ui/tabs';
import ClipboardPaste from '@lucide/svelte/icons/clipboard-paste';
import Sparkles from '@lucide/svelte/icons/sparkles';
import { untrack } from 'svelte';
import BulkFilesList from './(components)/bulk-files-list.svelte';
import BulkPasteStep from './(components)/bulk-paste-step.svelte';
import BulkResultStep from './(components)/bulk-result-step.svelte';
import BulkReviewStep from './(components)/bulk-review-step.svelte';
import BulkUploadStep from './(components)/bulk-upload-step.svelte';
import { createBulkImportState } from './(components)/bulk-import-state.svelte';

let { data } = $props();

const wizard = createBulkImportState();

// Default tab: AI when the workspace has it on, paste when it doesn't.
// `untrack` makes the "capture once at mount" intent explicit — the
// user toggles freely after that.
let activeMode = $state<'ai' | 'paste'>(
  untrack(() => (data.isLLMEnabled ? 'ai' : 'paste'))
);
</script>

<div class="container mx-auto max-w-5xl py-8">
  <header class="mb-6 space-y-2">
    <div class="inline-flex items-center gap-2">
      <Sparkles class="h-5 w-5 text-primary"></Sparkles>
      <h1 class="text-2xl font-semibold tracking-tight">AI Statement Import</h1>
    </div>
    <p class="text-muted-foreground max-w-2xl text-sm">
      Drop in PDF statements from any of your accounts at once. AI reads each one, routes it to
      the right account (or proposes a new one), and you confirm before anything is saved.
    </p>
  </header>

  {#if wizard.step === 'upload'}
    <div class="space-y-4">
      <Tabs.Root bind:value={activeMode}>
        <Tabs.List>
          <Tabs.Trigger value="ai" class="flex items-center gap-2">
            <Sparkles class="h-3.5 w-3.5"></Sparkles>
            AI extracts
          </Tabs.Trigger>
          <Tabs.Trigger value="paste" class="flex items-center gap-2">
            <ClipboardPaste class="h-3.5 w-3.5"></ClipboardPaste>
            Paste from external AI
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="ai" class="mt-4">
          <BulkUploadStep state={wizard} isLLMEnabled={data.isLLMEnabled}></BulkUploadStep>
        </Tabs.Content>
        <Tabs.Content value="paste" class="mt-4">
          <BulkPasteStep wizard={wizard}></BulkPasteStep>
        </Tabs.Content>
      </Tabs.Root>

      <BulkFilesList state={wizard}></BulkFilesList>
    </div>
  {:else if wizard.step === 'review'}
    <BulkReviewStep state={wizard} accounts={data.accounts}></BulkReviewStep>
  {:else if wizard.step === 'committing' || wizard.step === 'complete'}
    <BulkResultStep state={wizard}></BulkResultStep>
  {/if}
</div>
