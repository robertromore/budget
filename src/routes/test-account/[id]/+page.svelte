<script lang="ts">
  import { onMount } from 'svelte';
  
  let counter = $state(0);
  let mounted = $state(false);
  
  console.log('🔧 TEST-ACCOUNT - Script execution');
  
  onMount(() => {
    console.log('🔧 TEST-ACCOUNT - Component mounted successfully');
    mounted = true;
    
    const interval = setInterval(() => {
      counter++;
      console.log('🔧 TEST-ACCOUNT - Still alive:', counter);
    }, 1000);
    
    return () => {
      console.log('🔧 TEST-ACCOUNT - Component unmounted');
      clearInterval(interval);
    };
  });
  
  $effect(() => {
    console.log('🔧 TEST-ACCOUNT - Effect running - mounted:', mounted, 'counter:', counter);
  });
</script>

<div style="background: yellow; padding: 20px; border: 3px solid green; min-height: 200px; color: black;">
  <h1 style="color: green; font-size: 32px;">TEST-ACCOUNT ROUTE - SHOULD NOT DISAPPEAR</h1>
  <p><strong>Current time:</strong> {new Date().toLocaleTimeString()}</p>
  <p><strong>Counter:</strong> {counter}</p>
  <p><strong>Mounted:</strong> {mounted ? 'YES' : 'NO'}</p>
  <p><strong>Route:</strong> /test-account/[id] (different from /accounts/[id])</p>
</div>