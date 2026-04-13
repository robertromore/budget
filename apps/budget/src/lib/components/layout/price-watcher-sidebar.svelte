<script lang="ts">
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Package from '@lucide/svelte/icons/package';
import Bell from '@lucide/svelte/icons/bell';
import TrendingUp from '@lucide/svelte/icons/trending-up';

import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user: _user = null }: Props = $props();
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
                  <span class="font-medium">Products</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/price-watcher/alerts" {...props} class="flex items-center gap-3">
                  <Bell class="h-4 w-4"></Bell>
                  <span class="font-medium">Alerts</span>
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
