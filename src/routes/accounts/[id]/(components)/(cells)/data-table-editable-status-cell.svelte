<script lang="ts">
  import CircleCheckBig from "lucide-svelte/icons/circle-check-big";
  import CalendarClock from "lucide-svelte/icons/calendar-clock";
  import Button from "$lib/components/ui/button/button.svelte";
  import { cn } from "$lib/utils";

  let {
    value = $bindable(),
    onUpdateValue,
  }: {
    value: string;
    onUpdateValue?: (newValue: unknown) => void;
  } = $props();

  const handleSubmit = (new_value: string) => {
    if (onUpdateValue) {
      onUpdateValue(new_value);
    }
  };
</script>

{#if value === "cleared" || value === "pending"}
  <Button onclick={() => handleSubmit(value === "cleared" ? "pending" : "cleared")} variant="ghost">
    <CircleCheckBig class={cn(value === "cleared" ? "text-green-500" : "text-gray-400")} size="14" />
  </Button>
{:else}
  <CalendarClock color="gray" size="14" />
{/if}
