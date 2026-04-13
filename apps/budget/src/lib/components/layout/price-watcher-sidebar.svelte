<script lang="ts">
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { Badge } from '$lib/components/ui/badge';
import { listProducts, listAlerts } from '$lib/query/price-watcher';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Package from '@lucide/svelte/icons/package';
import Bell from '@lucide/svelte/icons/bell';
import TrendingUp from '@lucide/svelte/icons/trending-up';

import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user: _user = null }: Props = $props();

const productsQuery = listProducts().options();
const alertsQuery = listAlerts().options();

const productCount = $derived(productsQuery.data?.length ?? 0);
const alertCount = $derived(alertsQuery.data?.filter((a) => a.enabled).length ?? 0);
</script>

<Sidebar.Root>
  <Sidebar.Header class="border-sidebar-border h-16 border-b">
    <div class="flex h-full items-center px-4">
      <span class="text-lg font-semibold">Price Watcher</span>
    </div>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/price-watcher" {...props} class="flex items-center gap-3">
                  <LayoutDashboard class="h-4 w-4"></LayoutDashboard>
                  <span class="font-medium">Dashboard</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/price-watcher/products" {...props} class="flex items-center gap-3">
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
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/price-watcher/alerts" {...props} class="flex items-center gap-3">
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
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/price-watcher/history" {...props} class="flex items-center gap-3">
                  <TrendingUp class="h-4 w-4"></TrendingUp>
                  <span class="font-medium">Price History</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</Sidebar.Root>
