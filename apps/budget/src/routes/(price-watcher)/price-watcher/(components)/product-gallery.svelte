<script lang="ts">
import { cn } from '$lib/utils';
import Package from '@lucide/svelte/icons/package';

interface Props {
  imageUrl?: string | null;
  images?: string | null;
  alt?: string;
}

let { imageUrl, images, alt = 'Product' }: Props = $props();

const imageList = $derived.by(() => {
  const list: string[] = [];
  if (imageUrl) list.push(imageUrl);
  if (images && images !== '[]') {
    try {
      const parsed = JSON.parse(images) as string[];
      for (const img of parsed) {
        if (img && !img.includes('grey-pixel') && !img.includes('sprite') && !list.includes(img)) {
          list.push(img);
        }
      }
    } catch {}
  }
  return list;
});

let selectedIndex = $state(0);
const selectedImage = $derived(imageList[selectedIndex] ?? null);

function selectImage(index: number) {
  selectedIndex = index;
}
</script>

<div class="space-y-3">
  <!-- Primary Image -->
  {#if selectedImage}
    <div class="flex items-center justify-center overflow-hidden rounded-lg border bg-white">
      <img
        src={selectedImage}
        {alt}
        class="max-h-72 w-full object-contain p-4" />
    </div>
  {:else}
    <div class="bg-muted flex h-48 items-center justify-center rounded-lg border">
      <Package class="text-muted-foreground h-16 w-16" />
    </div>
  {/if}

  <!-- Thumbnail Strip -->
  {#if imageList.length > 1}
    <div class="flex gap-2 overflow-x-auto pb-1">
      {#each imageList as img, index}
        <button
          type="button"
          onclick={() => selectImage(index)}
          onmouseenter={() => selectImage(index)}
          class={cn(
            'h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-all',
            index === selectedIndex
              ? 'border-primary ring-primary/20 ring-2'
              : 'border-transparent hover:border-muted-foreground/30'
          )}>
          <img
            src={img}
            alt="{alt} thumbnail {index + 1}"
            loading="lazy"
            class="h-full w-full object-cover" />
        </button>
      {/each}
    </div>
  {/if}
</div>
