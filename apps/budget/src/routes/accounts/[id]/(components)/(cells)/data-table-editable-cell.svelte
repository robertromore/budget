<script lang="ts">
import {Button} from '$ui/lib/components/ui/button';
import * as Popover from '$ui/lib/components/ui/popover';
import {Textarea} from '$ui/lib/components/ui/textarea';
import {cn} from '$lib/utils';
import SquarePen from '@lucide/svelte/icons/square-pen';

let {value, onUpdateValue} = $props();
let open = $state(false);
let newValue = $state();
const handleSubmit = () => {
  open = false;
  value = newValue;
  onUpdateValue(value);
};
</script>

<Popover.Root
  bind:open
  onOpenChange={() => {
    newValue = '';
  }}>
  <Popover.Trigger>
    {#snippet child({props})}
      <Button
        {...props}
        variant="outline"
        class={cn(
          'block w-48 justify-start overflow-hidden text-left font-normal text-ellipsis whitespace-nowrap',
          !value && 'text-muted-foreground'
        )}>
        <SquarePen class="mr-1 inline-block size-4 align-top" />
        {value}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="grid w-auto gap-2 p-2" align="start">
    <Textarea
      placeholder=""
      value={value?.toString()}
      onchange={(e) => (newValue = (e.target as HTMLTextAreaElement).value)} />
    <Button onclick={handleSubmit}>Save</Button>
  </Popover.Content>
</Popover.Root>
