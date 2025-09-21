<script lang="ts">
import type { Component } from 'svelte';

interface Props {
  value: string;
  icon?: Component;
}

let { value, icon: Icon }: Props = $props();
</script>

<div class="flex items-center">
  {#if Icon}
    <Icon class="-mt-1 mr-1 inline-block size-4 text-muted-foreground" />
  {/if}
  <span>{value}</span>
</div>
