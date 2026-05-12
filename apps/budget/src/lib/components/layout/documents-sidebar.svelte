<script lang="ts">
import { page } from '$app/state';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { Badge } from '$lib/components/ui/badge';
import { rpc } from '$lib/query';
import { ACTIVE_NAV, BASE_NAV, isRouteActive } from '$lib/utils/route-match';
import FileText from '@lucide/svelte/icons/file-text';
import SidebarUserFooter from './sidebar-user-footer.svelte';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user = null }: Props = $props();

const documentsQuery = rpc.accountDocuments.getAllDocuments().options();
const taxYearsQuery = rpc.accountDocuments.getAvailableTaxYears().options();

const documents = $derived(documentsQuery.data ?? []);
const taxYears = $derived((taxYearsQuery.data ?? []).slice(0, 8));

const pathname = $derived(page.url.pathname);
const activeTaxYear = $derived(page.url.searchParams.get('taxYear'));
const isDocumentsRoot = $derived(isRouteActive(pathname, '/documents') && !activeTaxYear);
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
            <Sidebar.MenuButton isActive={isDocumentsRoot}>
              {#snippet child({ props })}
                <a
                  href="/documents"
                  {...props}
                  class={['flex items-center gap-3', BASE_NAV, isDocumentsRoot && ACTIVE_NAV.documents]}>
                  <FileText class="h-4 w-4"></FileText>
                  <span class="flex-1 font-medium">All Documents</span>
                  {#if documents.length > 0}
                    <Badge variant="secondary" class="h-5 min-w-5 px-1.5 text-xs">
                      {documents.length}
                    </Badge>
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    {#if taxYears.length > 0}
      <Sidebar.Group>
        <Sidebar.GroupLabel>By Tax Year</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            {#each taxYears as year}
              {@const yearActive = activeTaxYear === String(year)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton isActive={yearActive}>
                  {#snippet child({ props })}
                    <a
                      href="/documents?taxYear={year}"
                      {...props}
                      class={['flex items-center gap-2', BASE_NAV, yearActive && ACTIVE_NAV.documents]}>
                      <span class="text-sm">{year}</span>
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
