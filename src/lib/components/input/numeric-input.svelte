<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import Input from "$lib/components/ui/input/input.svelte";
  import * as Popover from "$lib/components/ui/popover";
  import { currencyFormatter } from "$lib/helpers/formatters";
  import { cn } from "$lib/utils";
  import Delete from "lucide-svelte/icons/delete";

  let {
    amount = $bindable(),
    onSubmit,
    open = $bindable(),
  }: {
    amount?: number;
    onSubmit?: () => void;
    open?: boolean;
  } = $props();

  let dialogOpen = $state(open || false);
  let new_amount = $state((amount || 0).toFixed(2));

  let input: HTMLInputElement | undefined | null = $state(null);
  const select = (num: string) => () => {
    new_amount += num;
  };
  const backspace = () => {
    new_amount = new_amount?.substring(0, new_amount.length - 1);
  };
  const clear = () => {
    new_amount = "";
    input?.focus();
  };
  const submit = () => {
    amount = parseFloat(new_amount);
    dialogOpen = false;
    onSubmit ? onSubmit() : null;
  };

  const valueWellFormatted = () => new_amount?.match(/\d+?\.\d{2}/) !== null;
  const handleKeyDown = (event: KeyboardEvent) => {
    if (dialogOpen) {
      if (new_amount?.includes(".") && event.key === ".") {
        event.preventDefault();
      }
      const target = event.target as HTMLInputElement;
      const start = target?.selectionStart || 0;
      const end = target?.selectionEnd || target?.value.length;
      switch (event.key) {
        case "Enter":
          if (new_amount) {
            submit();
          }
          break;

        case "Backspace":
          break;

        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          if (valueWellFormatted() && parseFloat(new_amount) != 0 && start === end) {
            event.preventDefault();
          }
          break;

        default:
          event.preventDefault();
      }
    }
  };
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="flex items-center space-x-4">
  <Popover.Root bind:open={dialogOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          class={cn(
            "w-36 justify-start text-left font-normal",
            !new_amount && "text-muted-foreground"
          )}
        >
          {currencyFormatter.format(parseFloat(new_amount) || 0)}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content
      class="p-0"
      align="start"
      onEscapeKeydown={() => (new_amount = amount!.toString())}
    >
      <div class="p-2">
        <Input bind:value={new_amount} class="mb-2" bind:ref={input} />
        <div class="keypad grid grid-cols-3 grid-rows-3 gap-2">
          {#each Array.from({ length: 9 }, (_, i) => i + 1) as i}
            <Button variant="outline" disabled={valueWellFormatted()} onclick={select(i.toString())}
              >{i}</Button
            >
          {/each}

          <Button variant="outline" disabled={new_amount?.includes(".")} onclick={select(".")}
            >.</Button
          >
          <Button variant="outline" disabled={valueWellFormatted()} onclick={select("0")}>0</Button>
          <Button variant="outline" disabled={!new_amount} onclick={backspace}>
            <Delete />
          </Button>

          <Button variant="outline" disabled={!new_amount} onclick={clear}>clear</Button>
          <Button class="col-span-2" disabled={!new_amount} onclick={submit}>submit</Button>
        </div>
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
