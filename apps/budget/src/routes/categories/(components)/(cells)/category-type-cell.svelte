<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import Tag from '@lucide/svelte/icons/tag';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';

interface Props {
  categoryType: string | null;
}

let { categoryType }: Props = $props();

const typeInfo = $derived(() => {
  switch (categoryType) {
    case 'income':
      return { icon: TrendingUp, label: 'Income', variant: 'default' as const };
    case 'expense':
      return { icon: TrendingDown, label: 'Expense', variant: 'secondary' as const };
    case 'transfer':
      return { icon: ArrowLeftRight, label: 'Transfer', variant: 'outline' as const };
    case 'savings':
      return { icon: PiggyBank, label: 'Savings', variant: 'default' as const };
    default:
      return { icon: Tag, label: 'Expense', variant: 'secondary' as const };
  }
});
</script>

{#snippet badgeContent()}
  {@const info = typeInfo()}
  <Badge variant={info.variant} class="text-xs">
    <info.icon class="mr-1 h-3 w-3" />
    {info.label}
  </Badge>
{/snippet}

{@render badgeContent()}
