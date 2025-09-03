<script lang="ts">
  let { rows = 5 }: { rows?: number } = $props();
</script>

<!-- Transaction Table Skeleton -->
<div class="rounded-md border">
  <div class="overflow-hidden">
    <table class="w-full">
      <thead>
        <tr class="border-b bg-muted/50">
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="h-4 w-16 bg-muted animate-pulse rounded"></div>
          </th>
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="h-4 w-20 bg-muted animate-pulse rounded"></div>
          </th>
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="h-4 w-16 bg-muted animate-pulse rounded"></div>
          </th>
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="h-4 w-24 bg-muted animate-pulse rounded"></div>
          </th>
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="h-4 w-20 bg-muted animate-pulse rounded"></div>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each Array(rows) as _, i}
          <tr class="border-b transition-colors hover:bg-muted/50">
            <td class="p-4 align-middle">
              <div class="h-4 w-20 bg-muted animate-pulse rounded" style="animation-delay: {i * 50}ms"></div>
            </td>
            <td class="p-4 align-middle">
              <div class="h-4 w-16 bg-muted animate-pulse rounded" style="animation-delay: {i * 50 + 25}ms"></div>
            </td>
            <td class="p-4 align-middle">
              <div class="h-4 w-24 bg-muted animate-pulse rounded" style="animation-delay: {i * 50 + 50}ms"></div>
            </td>
            <td class="p-4 align-middle">
              <div class="h-4 w-32 bg-muted animate-pulse rounded" style="animation-delay: {i * 50 + 75}ms"></div>
            </td>
            <td class="p-4 align-middle">
              <div class="h-4 w-16 bg-muted animate-pulse rounded" style="animation-delay: {i * 50 + 100}ms"></div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>