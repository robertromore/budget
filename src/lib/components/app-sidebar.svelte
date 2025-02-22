<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Sidebar from '$lib/components/ui/sidebar/index.js';
  import Ellipsis from 'lucide-svelte/icons/ellipsis';
  import Plus from 'lucide-svelte/icons/plus';
  import { page } from '$app/state';
  import { newAccountDialog } from '$lib/states/global.svelte';

  const { data: { accounts } } = $derived(page);
  const dialogOpen = $derived(newAccountDialog.get());
</script>

<Sidebar.Root>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel><a href="/accounts">Accounts</a></Sidebar.GroupLabel>
      <Sidebar.GroupAction title="Add Account" onclick={() => dialogOpen.current = true}>
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
                  <DropdownMenu.Item>
                    <span>Edit</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item>
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
