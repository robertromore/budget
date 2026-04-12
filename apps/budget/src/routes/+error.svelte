<script lang="ts">
import { page } from '$app/stores';
import { Button } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
</script>

<svelte:head>
  <title>Error {$page.status} - Budget App</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center p-6">
  <Empty.Empty class="max-w-md">
    <Empty.EmptyMedia variant="icon">
      <TriangleAlert class="size-6" />
    </Empty.EmptyMedia>
    <Empty.EmptyHeader>
      <Empty.EmptyTitle>
        {#if $page.status === 404}
          Page Not Found
        {:else}
          Something Went Wrong
        {/if}
      </Empty.EmptyTitle>
      <Empty.EmptyDescription>
        {#if $page.error?.message}
          {$page.error.message}
        {:else if $page.status === 404}
          The page you're looking for doesn't exist or has been moved.
        {:else}
          An unexpected error occurred. Please try again.
        {/if}
      </Empty.EmptyDescription>
    </Empty.EmptyHeader>
    <Empty.EmptyContent>
      <div class="flex gap-2">
        <Button variant="outline" onclick={() => history.back()}>Go Back</Button>
        <Button href="/">Go Home</Button>
      </div>
    </Empty.EmptyContent>
  </Empty.Empty>
</div>
