<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Ellipsis from "@lucide/svelte/icons/ellipsis";
  import Plus from "@lucide/svelte/icons/plus";
  import { deleteAccountDialog, deleteAccountId, managingAccountId, newAccountDialog, newScheduleDialog, managingScheduleId } from "$lib/states/ui/global.svelte";
  import { AccountsState } from "$lib/states/entities/accounts.svelte";
  import { SchedulesState } from "$lib/states/entities/schedules.svelte";
  import AccountSortDropdown from "$lib/components/shared/account-sort-dropdown.svelte";

  const accountsState = $derived(AccountsState.get());
  const accounts = $derived(accountsState.sorted);
  const _newAccountDialog = $derived(newAccountDialog);
  const _managingAccountId = $derived(managingAccountId);

  const _deleteAccountDialog = $derived(deleteAccountDialog);
  const _deleteAccountId = $derived(deleteAccountId);

  const schedulesState = $derived(SchedulesState.get());
  const schedules = $derived(schedulesState.schedules.values());
  const _newScheduleDialog = $derived(newScheduleDialog);
  const _managingScheduleId = $derived(managingScheduleId);
</script>

<Sidebar.Root>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel><a href="/accounts">Accounts</a></Sidebar.GroupLabel>
      <AccountSortDropdown size="default" variant="outline" />
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
                    <span data-testid="account-name">{account.name}</span>
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

    <Sidebar.Group>
      <Sidebar.GroupLabel><a href="/schedules">Schedules</a></Sidebar.GroupLabel>
      <Sidebar.GroupAction title="Add Schedule" onclick={() => {
        _managingScheduleId.current = 0;
        _newScheduleDialog.setTrue();
      }}>
        <Plus /> <span class="sr-only">Add Schedule</span>
      </Sidebar.GroupAction>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each schedules as schedule}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href="/schedules/{schedule.id}" {...props}>
                    <span>{schedule.name}</span>
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
                    _managingScheduleId.current = schedule.id;
                    _newScheduleDialog.setTrue();
                  }}>
                    <span>Edit</span>
                  </DropdownMenu.Item>
                  <!-- <DropdownMenu.Item onclick={() => {
                    _deleteAccountId.current = schedule.id;
                    _deleteAccountDialog.setTrue();
                  }}>
                    <span>Delete</span>
                  </DropdownMenu.Item> -->
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</Sidebar.Root>
