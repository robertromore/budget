<script lang="ts">
import {Skeleton} from '$lib/components/ui/skeleton';
import * as Table from '$lib/components/ui/table';

interface Props {
  rows?: number;
  columns?: number;
}

let {rows = 10, columns = 8}: Props = $props();
</script>

<div class="space-y-4">
  <!-- Toolbar skeleton -->
  <div class="flex items-center justify-between">
    <Skeleton class="h-8 w-[250px]" />
    <Skeleton class="h-8 w-[100px]" />
  </div>

  <!-- Table skeleton -->
  <div class="rounded-md border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          {#each Array(columns) as _, i}
            <Table.Head>
              <Skeleton class="h-6 w-full" />
            </Table.Head>
          {/each}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each Array(rows) as _, rowIndex}
          <Table.Row>
            {#each Array(columns) as _, colIndex}
              <Table.Cell>
                <Skeleton class="h-6 w-full" />
              </Table.Cell>
            {/each}
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Pagination skeleton -->
  <div class="flex items-center justify-between px-2">
    <Skeleton class="h-4 w-[200px]" />
    <div class="flex items-center space-x-6">
      <Skeleton class="h-8 w-[150px]" />
      <Skeleton class="h-8 w-[100px]" />
      <div class="flex space-x-2">
        <Skeleton class="h-8 w-8" />
        <Skeleton class="h-8 w-8" />
        <Skeleton class="h-8 w-8" />
        <Skeleton class="h-8 w-8" />
      </div>
    </div>
  </div>
</div>
