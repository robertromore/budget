<script lang="ts">
import type {Schedule} from '$lib/schema/schedules.js';

let {data} = $props();
const schedule: Schedule | undefined = $derived(data.schedule);

$inspect(schedule);
</script>

<h1 class="text-3xl">Schedule: {schedule?.name}</h1>
