<script lang="ts">
  import { Combobox as ComboboxPrimitive } from 'bits-ui';
  import { cn } from '$lib/utils.js';

  type $$Props = ComboboxPrimitive.LabelProps;

  let className: $$Props['class'] = undefined;
  export { className as class };
</script>

<ComboboxPrimitive.Label
  class={cn('px-2 py-1.5 text-sm font-semibold', className)}
  {...$$restProps}
>
  <slot />
</ComboboxPrimitive.Label>
