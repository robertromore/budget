<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Dialog from '$lib/components/ui/dialog';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as RadioGroup from '$lib/components/ui/radio-group';
import { skipOccurrence } from '$lib/query/schedules';
import {
  closeSkipOccurrenceDialog,
  skipOccurrenceData,
  skipOccurrenceDialog
} from '$lib/states/ui/global.svelte';
import CalendarX from '@lucide/svelte/icons/calendar-x';
import FastForward from '@lucide/svelte/icons/fast-forward';
import { toast } from '$lib/utils/toast-interceptor';

const _skipOccurrenceDialog = $derived(skipOccurrenceDialog);
const _skipOccurrenceData = $derived(skipOccurrenceData);

let skipType = $state<'single' | 'push_forward'>('single');
let reason = $state('');
let isSubmitting = $state(false);

const skipMutation = skipOccurrence().options();

const formattedDate = $derived.by(() => {
  if (!_skipOccurrenceData.date) return '';
  const date = new Date(_skipOccurrenceData.date + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

async function handleSkip() {
  if (!_skipOccurrenceData.scheduleId || !_skipOccurrenceData.date) return;

  isSubmitting = true;
  try {
    await skipMutation.mutateAsync({
      scheduleId: _skipOccurrenceData.scheduleId,
      date: _skipOccurrenceData.date,
      skipType,
      reason: reason.trim() || undefined
    });

    const actionText = skipType === 'single' ? 'skipped' : 'pushed forward';
    toast.success(`Occurrence ${actionText}`, {
      description: `${formattedDate} has been ${actionText}`
    });

    handleClose();
  } catch (error) {
    console.error('Failed to skip occurrence:', error);
    toast.error('Failed to skip occurrence');
  } finally {
    isSubmitting = false;
  }
}

function handleClose() {
  closeSkipOccurrenceDialog();
  skipType = 'single';
  reason = '';
}

function handleOpenChange(open: boolean) {
  if (!open) {
    handleClose();
  }
}
</script>

<Dialog.Root
  open={_skipOccurrenceDialog.current}
  onOpenChange={handleOpenChange}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Skip Scheduled Transaction</Dialog.Title>
      <Dialog.Description>
        Choose how to handle the scheduled occurrence for <strong>{_skipOccurrenceData.scheduleName}</strong> on {formattedDate}.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-6 py-4">
      <RadioGroup.Root bind:value={skipType} class="space-y-3">
        <div
          class="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 {skipType === 'single' ? 'border-primary bg-primary/5' : ''}">
          <RadioGroup.Item value="single" id="skip-single" class="mt-0.5" />
          <div class="flex-1 space-y-1">
            <Label for="skip-single" class="flex items-center gap-2 font-medium cursor-pointer">
              <CalendarX class="h-4 w-4" />
              Skip this occurrence only
            </Label>
            <p class="text-sm text-muted-foreground">
              Only skip the {formattedDate} occurrence. Future occurrences remain unchanged.
            </p>
          </div>
        </div>

        <div
          class="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 {skipType === 'push_forward' ? 'border-primary bg-primary/5' : ''}">
          <RadioGroup.Item value="push_forward" id="skip-push" class="mt-0.5" />
          <div class="flex-1 space-y-1">
            <Label for="skip-push" class="flex items-center gap-2 font-medium cursor-pointer">
              <FastForward class="h-4 w-4" />
              Push all dates forward
            </Label>
            <p class="text-sm text-muted-foreground">
              Skip this occurrence and shift all future occurrences forward by one interval.
            </p>
          </div>
        </div>
      </RadioGroup.Root>

      <div class="space-y-2">
        <Label for="reason">Reason (optional)</Label>
        <Input
          id="reason"
          placeholder="e.g., Payment made early, Holiday postponement"
          bind:value={reason}
        />
      </div>
    </div>

    <Dialog.Footer class="flex-col gap-2 sm:flex-row">
      <Button variant="outline" onclick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button onclick={handleSkip} disabled={isSubmitting}>
        {#if isSubmitting}
          <span class="animate-spin mr-2">...</span>
        {/if}
        {skipType === 'single' ? 'Skip Occurrence' : 'Push Forward'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
