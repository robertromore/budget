<script lang="ts">
import { page } from '$app/state';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { Badge } from '$lib/components/ui/badge';
import { rpc } from '$lib/query';
import { ACTIVE_NAV_CLASS, isRouteActive } from '$lib/utils/route-match';
import Zap from '@lucide/svelte/icons/zap';
import ZapOff from '@lucide/svelte/icons/zap-off';
import Plus from '@lucide/svelte/icons/plus';
import SidebarUserFooter from './sidebar-user-footer.svelte';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user = null }: Props = $props();

const rulesQuery = rpc.automation.getAll().options();
const rules = $derived(rulesQuery.data ?? []);
const enabledRules = $derived(rules.filter((r) => r.isEnabled));
const disabledRules = $derived(rules.filter((r) => !r.isEnabled));

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
          {@const allActive = isRouteActive(pathname, '/automation')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={allActive}>
              {#snippet child({ props })}
                <a
                  href="/automation"
                  {...props}
                  class={['flex items-center gap-3', allActive && ACTIVE_NAV_CLASS]}>
                  <Zap class="h-4 w-4"></Zap>
                  <span class="flex-1 font-medium">All Rules</span>
                  {#if rules.length > 0}
                    <Badge variant="secondary" class="h-5 min-w-5 px-1.5 text-xs">
                      {rules.length}
                    </Badge>
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {@const newActive = isRouteActive(pathname, '/automation/new')}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={newActive}>
              {#snippet child({ props })}
                <a
                  href="/automation/new"
                  {...props}
                  class={['flex items-center gap-3', newActive && ACTIVE_NAV_CLASS]}>
                  <Plus class="h-4 w-4"></Plus>
                  <span class="font-medium">New Rule</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if enabledRules.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Enabled</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each enabledRules.slice(0, 8) as rule (rule.id)}
              {@const ruleActive = isRouteActive(pathname, `/automation/${rule.id}`, 'prefix')}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={ruleActive}>
                  {#snippet child({ props })}
                    <a
                      href="/automation/{rule.id}"
                      {...props}
                      class={['flex items-center gap-2', ruleActive && ACTIVE_NAV_CLASS]}>
                      <Zap class="h-3.5 w-3.5 shrink-0 text-orange-500" />
                      <span class="truncate text-sm">{rule.name}</span>
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}

    {#if disabledRules.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Disabled</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each disabledRules.slice(0, 5) as rule (rule.id)}
              {@const ruleActive = isRouteActive(pathname, `/automation/${rule.id}`, 'prefix')}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={ruleActive}>
                  {#snippet child({ props })}
                    <a
                      href="/automation/{rule.id}"
                      {...props}
                      class={['flex items-center gap-2', ruleActive && ACTIVE_NAV_CLASS]}>
                      <ZapOff class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <span class="text-muted-foreground truncate text-sm">{rule.name}</span>
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
