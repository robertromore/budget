<script lang="ts">
import { Badge } from '$lib/components/ui/badge';

type Status = 'cleared' | 'pending' | 'scheduled';

interface Props {
  status: Status | null | undefined;
}

let { status }: Props = $props();

const variant = $derived(
  status === 'cleared'
    ? ('default' as const)
    : status === 'scheduled'
      ? ('outline' as const)
      : ('secondary' as const)
);

const label = $derived(status ?? 'pending');
</script>

<Badge {variant} class="capitalize">{label}</Badge>
