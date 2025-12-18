<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { ManageScheduleForm } from '$lib/components/forms';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import type { Schedule } from '$lib/schema/schedules';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Calendar from '@lucide/svelte/icons/calendar';

// Get returnTo parameter from URL
const returnTo = $derived(page.url.searchParams.get('returnTo') || '/schedules');

const handleSave = (schedule?: Schedule) => {
  if (schedule?.slug) {
    // Navigate to the new schedule's detail page
    setTimeout(() => {
      goto(`/schedules/${schedule.slug}`, { replaceState: true });
    }, 100);
  } else {
    // Navigate back to where the user came from
    goto(returnTo);
  }
};
</script>

<svelte:head>
  <title>New Schedule - Budget App</title>
  <meta name="description" content="Create a new recurring schedule" />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href={returnTo} class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Calendar class="text-muted-foreground h-8 w-8" />
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
      <Card.Description>Fill in the details for your new recurring schedule.</Card.Description>
    </Card.Header>
    <Card.Content>
      <ManageScheduleForm scheduleId={0} duplicateMode={false} onSave={handleSave} />
    </Card.Content>
  </Card.Root>
</div>
