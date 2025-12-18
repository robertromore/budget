<script lang="ts">
import { Button } from '$lib/components/ui/button';
import type { Payee } from '$lib/schema';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import User from '@lucide/svelte/icons/user';

interface Props {
  payee: Payee;
  onView: (payee: Payee) => void;
  onEdit: (payee: Payee) => void;
  onDelete: (payee: Payee) => void;
  onViewAnalytics: (payee: Payee) => void;
}

let { payee, onView, onEdit, onDelete, onViewAnalytics }: Props = $props();
</script>

<div class="flex items-center justify-end gap-1">
  <Button
    onclick={() => onView(payee)}
    variant="ghost"
    size="sm"
    aria-label="View payee {payee.name}">
    <User class="h-4 w-4" />
  </Button>

  <Button
    onclick={() => onViewAnalytics(payee)}
    variant="ghost"
    size="sm"
    aria-label="View analytics for {payee.name}">
    <BarChart3 class="h-4 w-4" />
  </Button>

  <Button
    onclick={() => onEdit(payee)}
    variant="ghost"
    size="sm"
    aria-label="Edit payee {payee.name}">
    <Pencil class="h-4 w-4" />
  </Button>

  <Button
    onclick={() => onDelete(payee)}
    variant="ghost"
    size="sm"
    class="text-destructive hover:text-destructive"
    aria-label="Delete payee {payee.name}">
    <Trash2 class="h-4 w-4" />
  </Button>
</div>
