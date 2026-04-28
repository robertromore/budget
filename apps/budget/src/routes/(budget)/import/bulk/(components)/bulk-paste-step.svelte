<script lang="ts">
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Collapsible from '$lib/components/ui/collapsible';
import FileUploadDropzone from '$lib/components/import/file-upload-dropzone.svelte';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import { Textarea } from '$lib/components/ui/textarea';
import { STATEMENT_EXTRACTION_PROMPT } from '$core/server/import/parser-runtime/executors/pdf-statement-prompt';
import { toast } from '$lib/utils/toast-interceptor';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import ClipboardCopy from '@lucide/svelte/icons/clipboard-copy';
import Loader from '@lucide/svelte/icons/loader-2';
import type { BulkImportState } from './bulk-import-state.svelte';

interface Props {
  wizard: BulkImportState;
}

let { wizard }: Props = $props();

type InputMode = 'paste' | 'upload';
let inputMode = $state<InputMode>('paste');
let fileNameDraft = $state('');
let pastedText = $state('');
let isAdding = $state(false);
let inlineError = $state<string | null>(null);
let promptOpen = $state(false);

const placeholderName = $derived(`Pasted statement ${wizard.totalFiles + 1}`);

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(STATEMENT_EXTRACTION_PROMPT);
    toast.success('Prompt copied');
  } catch (err) {
    toast.error('Could not copy', {
      description: err instanceof Error ? err.message : 'Clipboard unavailable',
    });
  }
}

async function handleAddPaste() {
  if (!pastedText.trim()) {
    inlineError = 'Paste the JSON returned by your AI before adding.';
    return;
  }
  await submit(fileNameDraft || placeholderName, pastedText);
}

async function handleUploadFile(file: File) {
  if (file.size > 2_000_000) {
    inlineError = 'File too large. Pastes are capped at 2MB.';
    return;
  }
  let text: string;
  try {
    text = await file.text();
  } catch (err) {
    inlineError = err instanceof Error ? err.message : 'Could not read file';
    return;
  }
  // Default the file name to the uploaded JSON's name (sans extension).
  const derived = (fileNameDraft || file.name.replace(/\.json$/i, '')).trim();
  await submit(derived || placeholderName, text);
}

async function submit(name: string, raw: string) {
  isAdding = true;
  inlineError = null;
  try {
    const result = await wizard.addPastedFile(name, raw);
    if (result.ok) {
      pastedText = '';
      fileNameDraft = '';
      toast.success(`Added ${name}`);
    } else {
      inlineError = result.error;
    }
  } finally {
    isAdding = false;
  }
}
</script>

<div class="space-y-4">
  <!-- Prompt card -->
  <Card.Root>
    <Card.Header>
      <Card.Title>1. Get a structured extraction from your AI</Card.Title>
      <Card.Description>
        Open Claude Desktop, Claude.ai, ChatGPT, or any AI you trust with documents. Attach
        your PDF statement, paste the prompt below, and it will return a JSON object you can
        bring back here.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-2">
      <div class="flex items-center gap-2">
        <Button onclick={copyPrompt} variant="default">
          <ClipboardCopy class="mr-2 h-4 w-4"></ClipboardCopy>
          Copy prompt
        </Button>
        <Collapsible.Root bind:open={promptOpen}>
          <Collapsible.Trigger>
            {#snippet child({ props })}
              <Button variant="ghost" {...props}>
                <ChevronDown
                  class="mr-1 h-4 w-4 transition-transform {promptOpen ? 'rotate-180' : ''}"
                ></ChevronDown>
                {promptOpen ? 'Hide' : 'View'} prompt
              </Button>
            {/snippet}
          </Collapsible.Trigger>
        </Collapsible.Root>
      </div>
      <Collapsible.Root bind:open={promptOpen}>
        <Collapsible.Content>
          <pre
            class="bg-muted text-muted-foreground mt-2 max-h-96 overflow-auto rounded-md border p-3 text-xs whitespace-pre-wrap">{STATEMENT_EXTRACTION_PROMPT}</pre>
        </Collapsible.Content>
      </Collapsible.Root>
    </Card.Content>
  </Card.Root>

  <!-- Paste form -->
  <Card.Root>
    <Card.Header>
      <Card.Title>2. Paste the JSON it gave you</Card.Title>
      <Card.Description>
        Each statement is added as its own file in the list below. Repeat for additional
        statements. We'll match each one to an account on the next step.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-3">
      <!-- Input mode toggle -->
      <div class="flex gap-2">
        <Button
          variant={inputMode === 'paste' ? 'default' : 'outline'}
          size="sm"
          onclick={() => {
            inputMode = 'paste';
            inlineError = null;
          }}
        >
          Paste JSON
        </Button>
        <Button
          variant={inputMode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onclick={() => {
            inputMode = 'upload';
            inlineError = null;
          }}
        >
          Upload .json file
        </Button>
      </div>

      <div class="space-y-1">
        <Label for="paste-name" class="text-xs">File name (optional)</Label>
        <Input
          id="paste-name"
          bind:value={fileNameDraft}
          maxlength={200}
          placeholder={placeholderName}
        ></Input>
      </div>

      {#if inputMode === 'paste'}
        <div class="space-y-1">
          <Label for="paste-body" class="text-xs">JSON</Label>
          <Textarea
            id="paste-body"
            bind:value={pastedText}
            placeholder={'{\n  "header": { ... },\n  "transactions": [ ... ]\n}'}
            class="min-h-64 font-mono text-xs"
            disabled={isAdding}
          ></Textarea>
        </div>
      {:else}
        <FileUploadDropzone
          acceptedFormats={['.json']}
          maxFileSize={2 * 1024 * 1024}
          allowMultiple={false}
          showPreview={false}
          onFileSelected={(file) => void handleUploadFile(file)}
          onFileRejected={(err) => (inlineError = err)}
        ></FileUploadDropzone>
      {/if}

      {#if inlineError}
        <Alert variant="destructive">
          <CircleAlert class="h-4 w-4"></CircleAlert>
          <AlertDescription>{inlineError}</AlertDescription>
        </Alert>
      {/if}
    </Card.Content>
    <Card.Footer class="flex justify-end gap-2">
      {#if inputMode === 'paste'}
        <Button onclick={handleAddPaste} disabled={isAdding || !pastedText.trim()}>
          {#if isAdding}
            <Loader class="mr-2 h-4 w-4 animate-spin"></Loader>
            Adding…
          {:else}
            Add statement
          {/if}
        </Button>
      {/if}
    </Card.Footer>
  </Card.Root>
</div>
