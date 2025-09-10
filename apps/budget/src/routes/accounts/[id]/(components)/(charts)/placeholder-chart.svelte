<script lang="ts">
interface Props {
  title: string;
  description: string;
  icon: any;
}

let {title, description, icon}: Props = $props();
</script>

<div class="text-muted-foreground flex h-full items-center justify-center">
  <div class="text-center">
    <icon class="mx-auto mb-4 h-12 w-12 opacity-50"></icon>
    <h3 class="mb-2 font-semibold">{title}</h3>
    <p>{description}</p>
    <p class="mt-2 text-sm">Chart implementation coming soon...</p>
  </div>
</div>
