<script lang="ts">
import { page } from '$app/state';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { ACTIVE_NAV_CLASS, isRouteActive } from '$lib/utils/route-match';
import Brain from '@lucide/svelte/icons/brain';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Sparkles from '@lucide/svelte/icons/sparkles';
import SidebarUserFooter from './sidebar-user-footer.svelte';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user = null }: Props = $props();

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
          {@const ovActive = isRouteActive(pathname, '/intelligence')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={ovActive}>
              {#snippet child({ props })}
                <a
                  href="/intelligence"
                  {...props}
                  class={['flex items-center gap-3', ovActive && ACTIVE_NAV_CLASS]}>
                  <Brain class="h-4 w-4"></Brain>
                  <span class="font-medium">Overview</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const anomActive = isRouteActive(pathname, '/intelligence/anomalies', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={anomActive}>
              {#snippet child({ props })}
                <a
                  href="/intelligence/anomalies"
                  {...props}
                  class={['flex items-center gap-3', anomActive && ACTIVE_NAV_CLASS]}>
                  <AlertTriangle class="h-4 w-4"></AlertTriangle>
                  <span class="font-medium">Anomalies</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const fcActive = isRouteActive(pathname, '/intelligence/forecasts', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={fcActive}>
              {#snippet child({ props })}
                <a
                  href="/intelligence/forecasts"
                  {...props}
                  class={['flex items-center gap-3', fcActive && ACTIVE_NAV_CLASS]}>
                  <TrendingUp class="h-4 w-4"></TrendingUp>
                  <span class="font-medium">Forecasts</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const patActive = isRouteActive(pathname, '/patterns', 'prefix')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={patActive}>
              {#snippet child({ props })}
                <a
                  href="/patterns"
                  {...props}
                  class={['flex items-center gap-3', patActive && ACTIVE_NAV_CLASS]}>
                  <Sparkles class="h-4 w-4"></Sparkles>
                  <span class="font-medium">Patterns</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <SidebarUserFooter {user} />
</Sidebar.Root>
