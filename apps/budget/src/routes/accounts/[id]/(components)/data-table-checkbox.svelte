<script lang="ts">
import type {Checkbox as CheckboxPrimitive, WithoutChildrenOrChild} from 'bits-ui';
import {Checkbox} from '$ui/lib/components/ui/checkbox';

let {checked, ...restProps}: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
</script>

<Checkbox {checked} {...restProps} />
