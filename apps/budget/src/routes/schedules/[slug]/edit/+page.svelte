<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { ManageScheduleForm } from '$lib/components/forms';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import type { Schedule } from '$lib/schema/schedules';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Calendar from '@lucide/svelte/icons/calendar';

const slug = $derived(page.params['slug'] ?? '');
const schedulesState = $derived(SchedulesState.get());
const schedule = $derived(slug ? schedulesState.getBySlug(slug) : undefined);

const handleSave = (updatedSchedule?: Schedule) => {
  // Navigate back to the schedule detail page
  if (updatedSchedule?.slug) {
    setTimeout(() => {
      goto(`/schedules/${updatedSchedule.slug}`, { replaceState: true });
    }, 100);
  } else if (schedule) {
    goto(`/schedules/${schedule.slug}`);
  } else {
    goto('/schedules');
  }
};
</script>

<svelte:head>
  <title>Edit Schedule - Budget App</title>
  <meta name="description" content="Edit schedule details" />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/schedules/{slug}" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Schedule</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Calendar class="text-muted-foreground h-8 w-8" />
          Edit Schedule
        </h1>
        {#if schedule}
          <p class="text-muted-foreground mt-1">Update details for {schedule.name}</p>
        {/if}
      </div>
    </div>
  </div>

  {#if schedule}
    <!-- Form Card -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Schedule Information</Card.Title>
        <Card.Description>Update the details for your schedule.</Card.Description>
      </Card.Header>
      <Card.Content>
        <ManageScheduleForm scheduleId={schedule.id} duplicateMode={false} onSave={handleSave} />
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root>
      <Card.Content class="text-muted-foreground py-8 text-center">Schedule not found</Card.Content>
    </Card.Root>
  {/if}
</div>
