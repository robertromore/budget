<script lang="ts">
  interface Props {
    title: string;
    description: string;
    icon: any;
  }

  let { title, description, icon }: Props = $props();
</script>

<div class="flex items-center justify-center h-full text-muted-foreground">
  <div class="text-center">
    <icon class="h-12 w-12 mx-auto mb-4 opacity-50"></icon>
    <h3 class="font-semibold mb-2">{title}</h3>
    <p>{description}</p>
    <p class="mt-2 text-sm">Chart implementation coming soon...</p>
  </div>
</div>