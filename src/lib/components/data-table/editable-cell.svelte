<script lang="ts">
  import { Textarea } from '../ui/textarea';
  import { cn } from '$lib/utils';
  import { Button } from '../ui/button';
  import * as Popover from '../ui/popover';

  let {
    value,
    onUpdateValue
  }: {
    value: unknown;
    onUpdateValue: (newValue: unknown) => void;
  } = $props();

  let open = $state(false);

  let newValue = $state();

  const handleCancel = () => {
    open = false;
  };
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
    <Button
      variant="outline"
      class={cn(
        'block w-48 justify-start overflow-hidden text-ellipsis whitespace-nowrap text-left font-normal',
        !value && 'text-muted-foreground'
      )}
    >
      <span class="icon-[radix-icons--pencil-2] mr-2 inline-block h-4 w-4 align-top"></span>
      {value ? value : ''}
    </Button>
  </Popover.Trigger>
  <Popover.Content class="grid w-auto gap-2 p-2" align="start">
    <Textarea
      placeholder=""
      value={value?.toString()}
      on:change={(e) => newValue = (e.target as HTMLTextAreaElement).value}
    />
    <Button on:click={handleSubmit}>Save</Button>
  </Popover.Content>
</Popover.Root>
