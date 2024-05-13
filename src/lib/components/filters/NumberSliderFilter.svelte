<script lang="ts">
  import { Slider } from "$lib/components/ui/slider/index.js";
  import { cn } from '$lib/utils';

  type Props = {
    value?: String;
    class?: string;
    changeFilterValue: (new_value: unknown) => any;
    onClear?: () => {};
  };

  let { value = $bindable(), class: className, changeFilterValue, onClear }: Props = $props();

  const clear = () => {
    value = undefined;
    changeFilterValue(value);
    if (onClear) {
      onClear();
    }
  };
</script>

<div class={cn("relative w-full", className)}>
  <Slider value={[50]} max={100} step={1} />
</div>
