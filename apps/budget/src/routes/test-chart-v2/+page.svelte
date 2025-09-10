<script lang="ts">
  import { LineChart, Spline } from 'layerchart';

  // Simple test data with numbers instead of dates
  const testData = [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 15 },
    { x: 4, y: 25 },
    { x: 5, y: 30 }
  ];
</script>

<div class="p-8 space-y-8">
  <h1 class="text-2xl font-bold">Chart Core V2 Test</h1>
  
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">Basic LineChart Test</h2>
    <div class="h-[300px] border rounded p-4 bg-white">
      <LineChart 
        data={testData} 
        x="x" 
        y="y"
        yNice
        padding={{ top: 20, right: 20, bottom: 40, left: 40 }}
      >
        {#snippet marks()}
          <Spline stroke="blue" strokeWidth={2} />
        {/snippet}
      </LineChart>
    </div>
  </div>
  
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">Debug Info</h2>
    <pre class="text-xs bg-gray-100 p-4 rounded">
      Data: {JSON.stringify(testData, null, 2)}
    </pre>
  </div>
</div>