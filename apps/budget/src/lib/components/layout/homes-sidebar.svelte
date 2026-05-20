<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import { Button } from '$lib/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '$lib/components/ui/dialog';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { rpc } from '$lib/query';
import { homeDialogState } from '$lib/states/ui/home-dialog.svelte';
import { ACTIVE_NAV, BASE_NAV, isRouteActive } from '$lib/utils/route-match';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import HomeIcon from '@lucide/svelte/icons/home';
import MapPin from '@lucide/svelte/icons/map-pin';
import Package from '@lucide/svelte/icons/package';
import PenTool from '@lucide/svelte/icons/pen-tool';
import Plus from '@lucide/svelte/icons/plus';
import Tags from '@lucide/svelte/icons/tags';
import SidebarUserFooter from './sidebar-user-footer.svelte';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user = null }: Props = $props();

const homesQuery = rpc.homes.listHomes().options();
const createHomeMutation = rpc.homes.createHome.options();
const homes = $derived(homesQuery.data ?? []);

const pathname = $derived(page.url.pathname);

let newHomeName = $state('');
let newHomeDescription = $state('');
let newHomeAddress = $state('');

// Clear the form whenever the dialog opens (effect tracks the shared flag).
$effect(() => {
  if (homeDialogState.addHomeOpen) {
    newHomeName = '';
    newHomeDescription = '';
    newHomeAddress = '';
  }
});

async function handleCreateHome() {
  const name = newHomeName.trim();
  if (!name) return;
  const created = await createHomeMutation.mutateAsync({
    name,
    description: newHomeDescription.trim() || null,
    address: newHomeAddress.trim() || null,
  });
  homeDialogState.closeAddHome();
  if (created?.slug) {
    await goto(`/home/${created.slug}`);
  }
}

// Parse the active home slug from the URL: /home/<slug>/...
const activeHomeSlug = $derived.by(() => {
  const m = pathname.match(/^\/home\/([^/]+)/);
  return m && m[1] !== undefined ? m[1] : null;
});
const activeHome = $derived(homes.find((h) => h.slug === activeHomeSlug) ?? null);

const homeNavItems = $derived(
  activeHome
    ? [
        { href: `/home/${activeHome.slug}`, label: 'Dashboard', icon: LayoutDashboard, exact: true },
        { href: `/home/${activeHome.slug}/locations`, label: 'Locations', icon: MapPin },
        { href: `/home/${activeHome.slug}/items`, label: 'Items', icon: Package },
        { href: `/home/${activeHome.slug}/labels`, label: 'Labels', icon: Tags },
        { href: `/home/${activeHome.slug}/floor-plan`, label: 'Floor Plan', icon: PenTool },
      ]
    : []
);

function isExactMatch(href: string): boolean {
  return pathname === href;
}
</script>

<Sidebar.Root>
  <Sidebar.Header class="border-sidebar-border h-16 border-b">
    <WorkspaceSwitcher />
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {@const allActive = isRouteActive(pathname, '/home') && !activeHomeSlug}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={allActive}>
              {#snippet child({ props })}
                <a
                  href="/home"
                  {...props}
                  class={['flex items-center gap-3', BASE_NAV, allActive && ACTIVE_NAV.home]}>
                  <HomeIcon class="h-4 w-4"></HomeIcon>
                  <span class="font-medium">All Homes</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if homes.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel>Homes</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each homes as home (home.id)}
              {@const homeActive = home.slug === activeHomeSlug}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={homeActive}>
                  {#snippet child({ props })}
                    <a
                      href="/home/{home.slug}"
                      {...props}
                      class={['flex items-center gap-2', BASE_NAV, homeActive && ACTIVE_NAV.home]}>
                      <HomeIcon class="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <span class="truncate text-sm">{home.name}</span>
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}

    {#if activeHome && homeNavItems.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel class="truncate">{activeHome.name}</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each homeNavItems as item}
              {@const itemActive = item.exact
                ? isExactMatch(item.href)
                : isRouteActive(pathname, item.href, 'prefix')}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={itemActive}>
                  {#snippet child({ props })}
                    <a
                      href={item.href}
                      {...props}
                      class={['flex items-center gap-3', BASE_NAV, itemActive && ACTIVE_NAV.home]}>
                      <item.icon class="h-4 w-4"></item.icon>
                      <span class="font-medium">{item.label}</span>
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    {/if}

    <Sidebar.Group>
      <Sidebar.GroupContent>
        <button
          type="button"
          onclick={() => homeDialogState.openAddHome()}
          class="border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm font-medium transition-colors">
          <Plus class="h-4 w-4" />
          Add home
        </button>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <SidebarUserFooter {user} />
</Sidebar.Root>

<Dialog
  bind:open={
    () => homeDialogState.addHomeOpen,
    (v) => (v ? homeDialogState.openAddHome() : homeDialogState.closeAddHome())
  }>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Create new home</DialogTitle>
      <DialogDescription>Add a home to manage its inventory, locations, and labels.</DialogDescription>
    </DialogHeader>
    <form onsubmit={(e) => { e.preventDefault(); handleCreateHome(); }}>
      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <Label for="home-name">Name</Label>
          <Input
            id="home-name"
            bind:value={newHomeName}
            placeholder="My Home"
            required
            disabled={createHomeMutation.isPending} />
        </div>
        <div class="space-y-2">
          <Label for="home-description">Description</Label>
          <Input
            id="home-description"
            bind:value={newHomeDescription}
            placeholder="Optional description"
            disabled={createHomeMutation.isPending} />
        </div>
        <div class="space-y-2">
          <Label for="home-address">Address</Label>
          <Input
            id="home-address"
            bind:value={newHomeAddress}
            placeholder="Optional address"
            disabled={createHomeMutation.isPending} />
        </div>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onclick={() => homeDialogState.closeAddHome()}
          disabled={createHomeMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!newHomeName.trim() || createHomeMutation.isPending}>
          Create
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
