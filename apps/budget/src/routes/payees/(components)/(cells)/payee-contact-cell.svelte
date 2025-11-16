<script lang="ts">
import Mail from '@lucide/svelte/icons/mail';
import Phone from '@lucide/svelte/icons/phone';

interface Props {
  email: string | null;
  phone: string | null;
}

let {email, phone}: Props = $props();
</script>

<div class="space-y-1 text-sm">
  {#if email}
    <div class="text-muted-foreground flex items-center gap-1">
      <Mail class="h-3 w-3" />
      <span class="max-w-[200px] truncate">{email}</span>
    </div>
  {/if}
  {#if phone}
    <div class="text-muted-foreground flex items-center gap-1">
      <Phone class="h-3 w-3" />
      <span>{phone}</span>
    </div>
  {/if}
  {#if !email && !phone}
    <span class="text-muted-foreground">—</span>
  {/if}
</div>
