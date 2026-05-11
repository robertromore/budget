<script lang="ts">
import { page } from '$app/state';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { Badge } from '$lib/components/ui/badge';
import { rpc } from '$lib/query';
import { isRouteActive } from '$lib/utils/route-match';
import RefreshCw from '@lucide/svelte/icons/refresh-cw';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import SidebarUserFooter from './sidebar-user-footer.svelte';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user = null }: Props = $props();

const subscriptionsQuery = rpc.subscriptions.getAll().options();
const renewalsQuery = rpc.subscriptions.getUpcomingRenewals(30).options();

const allSubscriptions = $derived(subscriptionsQuery.data ?? []);
const activeSubscriptions = $derived(
  allSubscriptions.filter((s) => s.status === 'active')
);
const upcomingRenewals = $derived(renewalsQuery.data ?? []);

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
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={isRouteActive(pathname, '/subscriptions', 'prefix')}>
              {#snippet child({ props })}
                <a href="/subscriptions" {...props} class="flex items-center gap-3">
                  <RefreshCw class="h-4 w-4"></RefreshCw>
                  <span class="flex-1 font-medium">All Subscriptions</span>
                  {#if allSubscriptions.length > 0}
                    <Badge variant="secondary" class="h-5 min-w-5 px-1.5 text-xs">
                      {allSubscriptions.length}
                    </Badge>
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if upcomingRenewals.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Renewing in 30 days</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each upcomingRenewals.slice(0, 8) as sub (sub.id)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton>
                  {#snippet child({ props })}
                    <a href="/subscriptions" {...props} class="flex items-center gap-2">
                      <CalendarClock class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <span class="truncate text-sm">{sub.name}</span>
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {:else if activeSubscriptions.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Active</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each activeSubscriptions.slice(0, 8) as sub (sub.id)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton>
                  {#snippet child({ props })}
                    <a href="/subscriptions" {...props} class="flex items-center gap-2">
                      <RefreshCw class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <span class="truncate text-sm">{sub.name}</span>
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
