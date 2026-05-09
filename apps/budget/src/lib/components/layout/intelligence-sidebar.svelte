<script lang="ts">
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
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
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/intelligence" {...props} class="flex items-center gap-3">
                  <Brain class="h-4 w-4"></Brain>
                  <span class="font-medium">Overview</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/intelligence/anomalies" {...props} class="flex items-center gap-3">
                  <AlertTriangle class="h-4 w-4"></AlertTriangle>
                  <span class="font-medium">Anomalies</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/intelligence/forecasts" {...props} class="flex items-center gap-3">
                  <TrendingUp class="h-4 w-4"></TrendingUp>
                  <span class="font-medium">Forecasts</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/patterns" {...props} class="flex items-center gap-3">
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
