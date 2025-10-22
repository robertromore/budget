<script lang="ts">
import {goto} from '$app/navigation';
import {page} from '$app/state';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Calendar from '@lucide/svelte/icons/calendar';
import {ManageScheduleForm} from '$lib/components/forms';
import type {Schedule} from '$lib/schema/schedules';
import {SchedulesState} from '$lib/states/entities/schedules.svelte';

const slug = $derived(page.params['slug']);
const schedulesState = $derived(SchedulesState.get());
const schedule = $derived(schedulesState.getBySlug(slug));

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

<div class="container mx-auto py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/schedules/{slug}" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Schedule</span>
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Calendar class="h-8 w-8 text-muted-foreground" />
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
        <Card.Description>
          Update the details for your schedule.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <ManageScheduleForm
          scheduleId={schedule.id}
          duplicateMode={false}
          onSave={handleSave}
        />
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root>
      <Card.Content class="py-8 text-center text-muted-foreground">
        Schedule not found
      </Card.Content>
    </Card.Root>
  {/if}
</div>
