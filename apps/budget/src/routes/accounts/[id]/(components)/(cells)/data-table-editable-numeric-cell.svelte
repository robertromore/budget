<script lang="ts">
import {NumericInput} from '$lib/components/input';

let {
  value = $bindable(),
  onUpdateValue,
}: {
  value: number | undefined;
  onUpdateValue: (newValue: unknown) => void;
} = $props();

let open = $state(false);
const handleSubmit = () => {
  open = false;
  onUpdateValue(value);
};
</script>

<NumericInput bind:value onSubmit={handleSubmit} bind:open />
