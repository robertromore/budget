<script lang="ts">
import { page } from '$app/state';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { BudgetState } from '$lib/states/budgets.svelte';
import { ACTIVE_NAV, BASE_NAV, isRouteActive } from '$lib/utils/route-match';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Plus from '@lucide/svelte/icons/plus';
import Wallet from '@lucide/svelte/icons/wallet';
import SidebarUserFooter from './sidebar-user-footer.svelte';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user = null }: Props = $props();

const budgetState = $derived(BudgetState.get());
const activeBudgets = $derived(budgetState?.activeBudgets ?? []);

const pathname = $derived(page.url.pathname);
</script>

<Sidebar.Root>
  <Sidebar.Header class="border-sidebar-border h-16 border-b">
    <WorkspaceSwitcher />
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {@const allActive = isRouteActive(pathname, '/budgets')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={allActive}>
              {#snippet child({ props })}
                <a
                  href="/budgets"
                  {...props}
                  class={['flex items-center gap-3', BASE_NAV, allActive && ACTIVE_NAV.budgets]}>
                  <LayoutGrid class="h-4 w-4"></LayoutGrid>
                  <span class="font-medium">All Budgets</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const newActive = isRouteActive(pathname, '/budgets/new')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={newActive}>
              {#snippet child({ props })}
                <a
                  href="/budgets/new"
                  {...props}
                  class={['flex items-center gap-3', BASE_NAV, newActive && ACTIVE_NAV.budgets]}>
                  <Plus class="h-4 w-4"></Plus>
                  <span class="font-medium">New Budget</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if activeBudgets.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Active</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each activeBudgets as budget (budget.id)}
              {@const budgetActive = isRouteActive(pathname, `/budgets/${budget.slug}`, 'prefix')}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={budgetActive}>
                  {#snippet child({ props })}
                    <a
                      href="/budgets/{budget.slug}"
                      {...props}
                      class={['flex items-center gap-2', BASE_NAV, budgetActive && ACTIVE_NAV.budgets]}>
                      <Wallet class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <span class="truncate text-sm">{budget.name}</span>
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}
  </Sidebar.Content>

  <SidebarUserFooter {user} />
</Sidebar.Root>
