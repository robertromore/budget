<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Ellipsis from "lucide-svelte/icons/ellipsis";
  import Plus from "lucide-svelte/icons/plus";
  import { deleteAccountDialog, deleteAccountId, managingAccountId, newAccountDialog } from "$lib/states/global.svelte";
  import { accountsContext } from "$lib/states/accounts.svelte";

  const accountsState = $derived(accountsContext.get());
  const accounts = $derived(accountsState.accounts.values());
  const _newAccountDialog = $derived(newAccountDialog);
  const _managingAccountId = $derived(managingAccountId);

  const _deleteAccountDialog = $derived(deleteAccountDialog);
  const _deleteAccountId = $derived(deleteAccountId);
</script>

<Sidebar.Root>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel><a href="/accounts">Accounts</a></Sidebar.GroupLabel>
      <Sidebar.GroupAction title="Add Account" onclick={() => {
        _managingAccountId.current = 0;
        _newAccountDialog.setTrue();
      }}>
        <Plus /> <span class="sr-only">Add Account</span>
      </Sidebar.GroupAction>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each accounts as account}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href="/accounts/{account.id}" {...props}>
                    <span>{account.name}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  {#snippet child({ props })}
                    <Sidebar.MenuAction {...props}>
                      <Ellipsis />
                    </Sidebar.MenuAction>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content side="right" align="start">
                  <DropdownMenu.Item onclick={() => {
                    _managingAccountId.current = account.id;
                    _newAccountDialog.setTrue();
                  }}>
                    <span>Edit</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onclick={() => {
                    _deleteAccountId.current = account.id;
                    _deleteAccountDialog.setTrue();
                  }}>
                    <span>Delete</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</Sidebar.Root>
