<script lang="ts">
import {Badge} from '$lib/components/ui/badge';
import User from '@lucide/svelte/icons/user';
import Building from '@lucide/svelte/icons/building';
import Landmark from '@lucide/svelte/icons/landmark';
import Briefcase from '@lucide/svelte/icons/briefcase';

interface Props {
  payeeType: string | null;
}

let {payeeType}: Props = $props();

const typeInfo = $derived(() => {
  switch (payeeType) {
    case 'merchant':
      return {icon: Building, label: 'Merchant', variant: 'default' as const};
    case 'utility':
      return {icon: Building, label: 'Utility', variant: 'secondary' as const};
    case 'employer':
      return {icon: Briefcase, label: 'Employer', variant: 'default' as const};
    case 'financial_institution':
      return {icon: Landmark, label: 'Financial', variant: 'outline' as const};
    case 'government':
      return {icon: Landmark, label: 'Government', variant: 'outline' as const};
    case 'individual':
      return {icon: User, label: 'Individual', variant: 'secondary' as const};
    default:
      return {icon: User, label: 'Other', variant: 'outline' as const};
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
