<script lang="ts">
  import { onMount } from 'svelte';
  
  let counter = $state(0);
  let mounted = $state(false);
  
  console.log('🔧 ISOLATED TEST - Script execution');
  
  onMount(() => {
    console.log('🔧 ISOLATED TEST - Component mounted');
    mounted = true;
    
    const interval = setInterval(() => {
      counter++;
      console.log('🔧 ISOLATED TEST - Still alive:', counter);
    }, 1000);
    
    return () => {
      console.log('🔧 ISOLATED TEST - Component unmounted');
      clearInterval(interval);
    };
  });
  
  $effect(() => {
    console.log('🔧 ISOLATED TEST - Effect running - mounted:', mounted, 'counter:', counter);
  });
</script>

<div style="background: lime; padding: 20px; border: 3px solid blue; min-height: 200px; color: black;">
  <h1 style="color: blue; font-size: 32px;">ISOLATED TEST PAGE - NO LAYOUT DEPENDENCIES</h1>
  <p><strong>Current time:</strong> {new Date().toLocaleTimeString()}</p>
  <p><strong>Counter:</strong> {counter}</p>
  <p><strong>Mounted:</strong> {mounted ? 'YES' : 'NO'}</p>
</div>