<script lang="ts">
import { page } from '$app/state';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { Badge } from '$lib/components/ui/badge';
import { listProducts, listAlerts } from '$lib/query/price-watcher';
import { ACTIVE_NAV, isRouteActive } from '$lib/utils/route-match';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Package from '@lucide/svelte/icons/package';
import Bell from '@lucide/svelte/icons/bell';
import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Settings from '@lucide/svelte/icons/settings';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';

import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user: _user = null }: Props = $props();

const productsQuery = listProducts().options();
const alertsQuery = listAlerts().options();

const productCount = $derived(productsQuery.data?.length ?? 0);
const alertCount = $derived(alertsQuery.data?.filter((a) => a.enabled).length ?? 0);

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
          {@const dashActive = isRouteActive(pathname, '/price-watcher')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={dashActive}>
              {#snippet child({ props })}
                <a
                  href="/price-watcher"
                  {...props}
                  class={['flex items-center gap-3', dashActive && ACTIVE_NAV.priceWatcher]}>
                  <LayoutDashboard class="h-4 w-4"></LayoutDashboard>
                  <span class="font-medium">Dashboard</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const prodActive = isRouteActive(pathname, '/price-watcher/products', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={prodActive}>
              {#snippet child({ props })}
                <a
                  href="/price-watcher/products"
                  {...props}
                  class={['flex items-center gap-3', prodActive && ACTIVE_NAV.priceWatcher]}>
                  <Package class="h-4 w-4"></Package>
                  <span class="flex-1 font-medium">Products</span>
                  {#if productCount > 0}
                    <Badge variant="secondary" class="ml-auto h-5 min-w-5 px-1.5 text-xs">
                      {productCount}
                    </Badge>
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const cmpActive = isRouteActive(pathname, '/price-watcher/compare', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={cmpActive}>
              {#snippet child({ props })}
                <a
                  href="/price-watcher/compare"
                  {...props}
                  class={['flex items-center gap-3', cmpActive && ACTIVE_NAV.priceWatcher]}>
                  <ArrowLeftRight class="h-4 w-4"></ArrowLeftRight>
                  <span class="font-medium">Compare</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const alertsActive = isRouteActive(pathname, '/price-watcher/alerts', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={alertsActive}>
              {#snippet child({ props })}
                <a
                  href="/price-watcher/alerts"
                  {...props}
                  class={['flex items-center gap-3', alertsActive && ACTIVE_NAV.priceWatcher]}>
                  <Bell class="h-4 w-4"></Bell>
                  <span class="flex-1 font-medium">Alerts</span>
                  {#if alertCount > 0}
                    <Badge variant="secondary" class="ml-auto h-5 min-w-5 px-1.5 text-xs">
                      {alertCount}
                    </Badge>
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const histActive = isRouteActive(pathname, '/price-watcher/history', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={histActive}>
              {#snippet child({ props })}
                <a
                  href="/price-watcher/history"
                  {...props}
                  class={['flex items-center gap-3', histActive && ACTIVE_NAV.priceWatcher]}>
                  <TrendingUp class="h-4 w-4"></TrendingUp>
                  <span class="font-medium">Price History</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const setActive = isRouteActive(pathname, '/price-watcher/settings', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={setActive}>
              {#snippet child({ props })}
                <a
                  href="/price-watcher/settings"
                  {...props}
                  class={['flex items-center gap-3', setActive && ACTIVE_NAV.priceWatcher]}>
                  <Settings class="h-4 w-4"></Settings>
                  <span class="font-medium">Settings</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</Sidebar.Root>
