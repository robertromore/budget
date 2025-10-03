<script lang="ts">
import {goto} from '$app/navigation';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Calendar from '@lucide/svelte/icons/calendar';
import {ManageScheduleForm} from '$lib/components/forms';
import type {Schedule} from '$lib/schema/schedules';

const handleSave = (schedule?: Schedule) => {
  if (schedule?.slug) {
    // Navigate to the new schedule's detail page
    setTimeout(() => {
      goto(`/schedules/${schedule.slug}`, { replaceState: true });
    }, 100);
  } else {
    // Navigate back to schedules list
    goto('/schedules');
  }
};
</script>

<svelte:head>
  <title>New Schedule - Budget App</title>
  <meta name="description" content="Create a new recurring schedule" />
</svelte:head>

<div class="container mx-auto py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/schedules" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Schedules</span>
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Calendar class="h-8 w-8 text-muted-foreground" />
          New Schedule
        </h1>
        <p class="text-muted-foreground mt-1">Create a new recurring schedule</p>
      </div>
    </div>
  </div>

  <!-- Form Card -->
  <Card.Root class="max-w-4xl">
    <Card.Header>
      <Card.Title>Schedule Information</Card.Title>
      <Card.Description>
        Fill in the details for your new recurring schedule.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ManageScheduleForm
        scheduleId={0}
        duplicateMode={false}
        onSave={handleSave}
      />
    </Card.Content>
  </Card.Root>
</div>