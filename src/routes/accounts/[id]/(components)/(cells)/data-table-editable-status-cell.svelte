<script lang="ts">
  import CircleCheckBig from "lucide-svelte/icons/circle-check-big";
  import CalendarClock from "lucide-svelte/icons/calendar-clock";

  let {
    value = $bindable(),
    onUpdateValue,
  }: {
    value: string;
    onUpdateValue?: (newValue: unknown) => void;
  } = $props();

  const handleSubmit = (new_value: boolean) => {
    if (onUpdateValue) {
      onUpdateValue(new_value);
    }
  };
</script>

{#if value === "cleared" || value === "pending"}
  <CircleCheckBig color={value === "cleared" ? "green" : "gray"} size="14" />
{:else}
  <CalendarClock color="gray" size="14" />
{/if}
