<script lang="ts">
  import { Textarea } from '../ui/textarea';
  import { cn } from '$lib/utils';
  import { Button } from '../ui/button';
  import * as Popover from '../ui/popover';

  let { value, onUpdateValue }: {
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
  <Popover.Trigger asChild let:builder>
    <Button
      variant="outline"
      class={cn(
        "w-48 justify-start text-left font-normal text-ellipsis overflow-hidden whitespace-nowrap block",
        !value && "text-muted-foreground"
      )}
      builders={[builder]}
    >
      <span class="icon-[radix-icons--pencil-2] mr-2 h-4 w-4 inline-block align-top" />
      {value ? value : ""}
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-auto p-2 grid gap-2" align="start">
    <Textarea placeholder="" value={value?.toString()} on:change={(e) => newValue = (e.target as HTMLTextAreaElement).value } />
    <Button on:click={handleSubmit}>Save</Button>
  </Popover.Content>
</Popover.Root>
