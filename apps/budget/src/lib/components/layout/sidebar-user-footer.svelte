<script lang="ts">
import { goto } from '$app/navigation';
import { signOut, useSession } from '$lib/auth-client';
import * as Avatar from '$lib/components/ui/avatar/index.js';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { clearEncryptionCache } from '$lib/states/ui/encryption-unlock.svelte';
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import LogOut from '@lucide/svelte/icons/log-out';
import Settings from '@lucide/svelte/icons/settings';
import User from '@lucide/svelte/icons/user';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user: initialUser = null }: Props = $props();

const sessionStore = useSession();
const session = $derived($sessionStore);
const user = $derived(session.data?.user ?? initialUser);

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

async function handleSignOut() {
  clearEncryptionCache();
  await signOut();
  await goto('/login');
}
</script>

<Sidebar.Footer class="border-sidebar-border border-t">
  <Sidebar.Menu>
    <Sidebar.MenuItem>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Sidebar.MenuButton
              {...props}
              size="lg"
              class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar.Root class="h-8 w-8 rounded-lg">
                {#if user?.image}
                  <Avatar.Image src={user.image} alt={user.name ?? 'User'} />
                {/if}
                <Avatar.Fallback class="rounded-lg">
                  {getInitials(user?.name, user?.email)}
                </Avatar.Fallback>
              </Avatar.Root>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{user?.name ?? 'User'}</span>
                <span class="text-muted-foreground truncate text-xs">{user?.email ?? ''}</span>
              </div>
              <ChevronsUpDown class="ml-auto size-4" />
            </Sidebar.MenuButton>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
          side="bottom"
          align="end"
          sideOffset={4}>
          <DropdownMenu.Label class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar.Root class="h-8 w-8 rounded-lg">
                {#if user?.image}
                  <Avatar.Image src={user.image} alt={user.name ?? 'User'} />
                {/if}
                <Avatar.Fallback class="rounded-lg">
                  {getInitials(user?.name, user?.email)}
                </Avatar.Fallback>
              </Avatar.Root>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{user?.name ?? 'User'}</span>
                <span class="text-muted-foreground truncate text-xs">{user?.email ?? ''}</span>
              </div>
            </div>
          </DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Group>
            <DropdownMenu.Item onclick={() => goto('/settings/profile')}>
              <User class="mr-2 h-4 w-4" />
              Profile
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => goto('/settings')}>
              <Settings class="mr-2 h-4 w-4" />
              Settings
            </DropdownMenu.Item>
          </DropdownMenu.Group>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={handleSignOut}>
            <LogOut class="mr-2 h-4 w-4" />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Sidebar.MenuItem>
  </Sidebar.Menu>
</Sidebar.Footer>
