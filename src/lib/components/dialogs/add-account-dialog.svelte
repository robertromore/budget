<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import type { UseBoolean } from "$lib/hooks/ui/use-boolean.svelte";
  import type { UseNumber } from "$lib/hooks/ui/use-number.svelte";
  import { managingAccountId, newAccountDialog } from "$lib/states/ui/global.svelte";
  import ManageAccountForm from "../forms/manage-account-form.svelte";

  const dialogOpen: UseBoolean = $derived(newAccountDialog);
  const accountId: UseNumber = $derived(managingAccountId);
</script>

<Dialog.Root bind:open={() => dialogOpen.current, (newOpen) => dialogOpen.current = newOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{#if accountId.current === 0}Add{:else}Manage{/if} Account</Dialog.Title>
      <Dialog.Description>
        <ManageAccountForm accountId={accountId.current} onSave={() => dialogOpen.current = false} />
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
