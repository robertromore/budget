<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  
  onMount(() => {
    goto("/accounts");
  });
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="text-center">
    <h1 class="text-2xl font-semibold">Loading...</h1>
    <p class="text-muted-foreground">Redirecting to accounts</p>
  </div>
</div>