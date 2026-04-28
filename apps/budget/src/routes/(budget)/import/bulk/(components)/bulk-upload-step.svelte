<script lang="ts">
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import * as Card from '$lib/components/ui/card';
import FileUploadDropzone from '$lib/components/import/file-upload-dropzone.svelte';
import CircleAlert from '@lucide/svelte/icons/circle-alert';
import type { BulkImportState } from './bulk-import-state.svelte';

interface Props {
  state: BulkImportState;
  /**
   * Whether the workspace's AI is enabled. When false, the dropzone
   * still mounts but a banner explains uploads will fail at extraction
   * time so the user knows why and can switch to the Paste tab.
   */
  isLLMEnabled?: boolean;
}

let { state, isLLMEnabled = true }: Props = $props();
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Drop your statements</Card.Title>
    <Card.Description>
      Upload PDF statements from any of your accounts. AI reads each one to identify the
      account, opening and closing balances, and every transaction — then routes it to the
      right account or proposes a new one. You'll review every file before anything is saved.
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    {#if !isLLMEnabled}
      <Alert variant="destructive">
        <CircleAlert class="h-4 w-4"></CircleAlert>
        <AlertDescription>
          AI extraction needs an API key. Set one up in Settings → Intelligence, or switch to
          the Paste tab and use Claude Desktop / ChatGPT instead.
        </AlertDescription>
      </Alert>
    {/if}
    <FileUploadDropzone
      acceptedFormats={['.pdf']}
      maxFileSize={20 * 1024 * 1024}
      allowMultiple={true}
      showPreview={false}
      onFilesSelected={(files) => state.addFiles(files)}
    ></FileUploadDropzone>
  </Card.Content>
</Card.Root>
