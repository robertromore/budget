<script lang="ts">
let {rows = 5}: {rows?: number} = $props();
</script>

<!-- Transaction Table Skeleton -->
<div class="rounded-md border">
  <div class="overflow-hidden">
    <table class="w-full">
      <thead>
        <tr class="bg-muted/50 border-b">
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="bg-muted h-4 w-16 animate-pulse rounded"></div>
          </th>
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="bg-muted h-4 w-20 animate-pulse rounded"></div>
          </th>
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="bg-muted h-4 w-16 animate-pulse rounded"></div>
          </th>
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="bg-muted h-4 w-24 animate-pulse rounded"></div>
          </th>
          <th class="h-12 px-4 text-left align-middle font-medium">
            <div class="bg-muted h-4 w-20 animate-pulse rounded"></div>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each Array(rows) as _, i}
          <tr class="hover:bg-muted/50 border-b transition-colors">
            <td class="p-4 align-middle">
              <div
                class="bg-muted h-4 w-20 animate-pulse rounded"
                style="animation-delay: {i * 50}ms">
              </div>
            </td>
            <td class="p-4 align-middle">
              <div
                class="bg-muted h-4 w-16 animate-pulse rounded"
                style="animation-delay: {i * 50 + 25}ms">
              </div>
            </td>
            <td class="p-4 align-middle">
              <div
                class="bg-muted h-4 w-24 animate-pulse rounded"
                style="animation-delay: {i * 50 + 50}ms">
              </div>
            </td>
            <td class="p-4 align-middle">
              <div
                class="bg-muted h-4 w-32 animate-pulse rounded"
                style="animation-delay: {i * 50 + 75}ms">
              </div>
            </td>
            <td class="p-4 align-middle">
              <div
                class="bg-muted h-4 w-16 animate-pulse rounded"
                style="animation-delay: {i * 50 + 100}ms">
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
