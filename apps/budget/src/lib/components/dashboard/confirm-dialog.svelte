<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';

let {
  open = $bindable(false),
  title = 'Are you sure?',
  description = '',
  confirmLabel = 'Delete',
  variant = 'destructive' as 'destructive' | 'default',
  onConfirm,
}: {
  open?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  variant?: 'destructive' | 'default';
  onConfirm?: () => void;
} = $props();
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>{title}</AlertDialog.Title>
      {#if description}
        <AlertDialog.Description>{description}</AlertDialog.Description>
      {/if}
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <Button
        variant={variant}
        onclick={() => {
          onConfirm?.();
          open = false;
        }}>
        {confirmLabel}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
