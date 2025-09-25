<script lang="ts">
import * as Sheet from '$lib/components/ui/sheet';
import type {UseBoolean} from '$lib/hooks/ui/use-boolean.svelte';
import type {UseNumber} from '$lib/hooks/ui/use-number.svelte';
import {managingAccountId, newAccountDialog} from '$lib/states/ui/global.svelte';
import {ManageAccountForm} from '$lib/components/forms';

const dialogOpen: UseBoolean = $derived(newAccountDialog);
const accountId: UseNumber = $derived(managingAccountId);
</script>

<Sheet.Root bind:open={dialogOpen.current} onOpenChange={(open) => {
  dialogOpen.current = open;
}}>
  <Sheet.Content preventScroll={false} class="overflow-auto sm:max-w-lg">
    <Sheet.Header>
      <Sheet.Title>
        {#if accountId.current === 0}
          Add Account
        {:else}
          Manage Account
        {/if}
      </Sheet.Title>
      <Sheet.Description>
        <ManageAccountForm
          accountId={accountId.current}
          formId="add-account-dialog-form"
          onSave={() => (dialogOpen.current = false)} />
      </Sheet.Description>
    </Sheet.Header>
  </Sheet.Content>
</Sheet.Root>
