<script lang="ts">
import type {Component} from 'svelte';

interface Props {
  value: string;
  icon?: Component;
}

let {value, icon: Icon}: Props = $props();
</script>

<div class="flex items-center">
  {#if Icon}
    <Icon class="text-muted-foreground -mt-1 mr-1 inline-block size-4" />
  {/if}
  <span>{value}</span>
</div>
