<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Empty from '$lib/components/ui/empty';
import Tag from '@lucide/svelte/icons/tag';
</script>

<svelte:head>
  <title>Price Watcher - Budget App</title>
  <meta name="description" content="Track product prices and get alerts on price drops" />
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center">
  <Empty.Empty class="max-w-md">
    <Empty.EmptyMedia variant="icon">
      <Tag class="size-6" />
    </Empty.EmptyMedia>
    <Empty.EmptyHeader>
      <Empty.EmptyTitle>Price Watcher</Empty.EmptyTitle>
      <Empty.EmptyDescription>
        Track product prices across retailers and get notified when prices drop. Coming soon.
      </Empty.EmptyDescription>
    </Empty.EmptyHeader>
    <Empty.EmptyContent>
      <Button variant="outline" href="/">Back to Budget</Button>
    </Empty.EmptyContent>
  </Empty.Empty>
</div>
