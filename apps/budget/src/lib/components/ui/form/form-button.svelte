<script lang="ts">
import * as Button from '$ui/lib/components/ui/button';

let {ref = $bindable(null), ...restProps}: Button.Props = $props();
</script>

<Button.Root type="submit" bind:ref {...restProps} />
