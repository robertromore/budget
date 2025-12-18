<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Input } from '$lib/components/ui/input';
import * as Popover from '$lib/components/ui/popover';
import { Textarea } from '$lib/components/ui/textarea';
import { cn } from '$lib/utils';
import SquarePen from '@lucide/svelte/icons/square-pen';

interface Props {
  value: string | null;
  placeholder?: string;
  multiline?: boolean;
  onSave: (newValue: string) => Promise<void>;
}

let { value, placeholder = '', multiline = false, onSave }: Props = $props();
let open = $state(false);
let newValue = $state(value || '');

const handleSubmit = async () => {
  open = false;
  await onSave(newValue);
};

$effect(() => {
  if (open) {
    newValue = value || '';
  }
});
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        class={cn(
          'block w-full max-w-48 justify-start overflow-hidden text-left font-normal text-ellipsis whitespace-nowrap',
          !value && 'text-muted-foreground'
        )}>
        <SquarePen class="mr-1 inline-block size-4 shrink-0 align-top" />
        <span class="truncate">{value || placeholder}</span>
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="grid w-[800px]! max-w-none gap-2 p-2" align="start">
    {#if multiline}
      <Textarea {placeholder} bind:value={newValue} class="min-h-[150px] w-full" />
    {:else}
      <Input {placeholder} bind:value={newValue} class="min-w-[200px]" />
    {/if}
    <Button onclick={handleSubmit}>Save</Button>
  </Popover.Content>
</Popover.Root>
