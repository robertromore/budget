<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Popover from '$lib/components/ui/popover';
  import { Textarea } from '$lib/components/ui/textarea';
  import { cn } from '$lib/utils';
  import { Pencil2 } from 'svelte-radix';

	let { value, onUpdateValue } = $props();
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
  }}
>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class={cn(
          'block w-48 justify-start overflow-hidden text-ellipsis whitespace-nowrap text-left font-normal',
          !value && 'text-muted-foreground'
        )}
      >
        <Pencil2 class="mr-1 size-4 inline-block align-top"/>
        {value}
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="grid w-auto gap-2 p-2" align="start">
    <Textarea
      placeholder=""
      value={value?.toString()}
      onchange={(e) => newValue = (e.target as HTMLTextAreaElement).value}
    />
    <Button onclick={handleSubmit}>Save</Button>
  </Popover.Content>
</Popover.Root>
