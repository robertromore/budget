<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import type { ExpenseFormat } from '../../(data)/columns.svelte';
import { claimStatusEnum, type ClaimStatus } from '$lib/schema/hsa-claims';

interface Props {
  expense: ExpenseFormat;
  onManageClaims: () => void;
}

let { expense, onManageClaims }: Props = $props();

// Determine claim status
const claimStatus = $derived(() => {
  if (!expense.claims || expense.claims.length === 0) {
    return {
      status: 'not_submitted' as ClaimStatus,
      label: 'No Claim',
      variant: 'outline' as const,
    };
  }

  const mostRecentClaim = expense.claims[expense.claims.length - 1];
  const status = (mostRecentClaim.status || 'not_submitted') as ClaimStatus;

  // Map status to badge variant
  const variantMap: Record<ClaimStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    not_submitted: 'outline',
    pending_submission: 'secondary',
    submitted: 'default',
    in_review: 'default',
    approved: 'default',
    partially_approved: 'secondary',
    denied: 'destructive',
    resubmission_required: 'secondary',
    paid: 'default',
    withdrawn: 'outline',
  };

  return {
    status,
    label: claimStatusEnum[status] || status,
    variant: variantMap[status] || 'outline',
  };
});
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" size="sm">
        <Badge variant={claimStatus().variant}>{claimStatus().label}</Badge>
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="start">
    <DropdownMenu.Label>Claim Actions</DropdownMenu.Label>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onclick={onManageClaims}>Manage Claims</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
