<script lang="ts">
import * as Sidebar from '$lib/components/ui/sidebar/index.js';
import { Badge } from '$lib/components/ui/badge';
import { rpc } from '$lib/query';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import Target from '@lucide/svelte/icons/target';
import CalendarSync from '@lucide/svelte/icons/calendar-sync';
import Calendar from '@lucide/svelte/icons/calendar';
import SidebarUserFooter from './sidebar-user-footer.svelte';
import WorkspaceSwitcher from '../../../routes/(budget)/workspaces/(components)/workspace-switcher.svelte';
import type { LayoutData } from '../../../routes/$types';

interface Props {
  user?: LayoutData['user'];
}

let { user = null }: Props = $props();

const goalsQuery = rpc.financialGoals.listGoals().options();
const goals = $derived(goalsQuery.data ?? []);
const activeGoals = $derived(goals.filter((g) => !g.isCompleted));

const schedulesState = $derived(SchedulesState.get());
const activeSchedules = $derived(
  schedulesState?.all?.filter((s) => s.status === 'active') ?? []
);
</script>

<Sidebar.Root>
  <Sidebar.Header class="border-sidebar-border h-16 border-b">
    <WorkspaceSwitcher />
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Goals</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/goals" {...props} class="flex items-center gap-3">
                  <Target class="h-4 w-4"></Target>
                  <span class="flex-1 font-medium">All Goals</span>
                  {#if activeGoals.length > 0}
                    <Badge variant="secondary" class="h-5 min-w-5 px-1.5 text-xs">
                      {activeGoals.length}
                    </Badge>
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          {#each activeGoals.slice(0, 5) as goal (goal.id)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href="/goals" {...props} class="flex items-center gap-2 pl-7">
                    <span class="truncate text-sm">{goal.name}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group>
      <Sidebar.GroupLabel>Schedules</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/schedules" {...props} class="flex items-center gap-3">
                  <CalendarSync class="h-4 w-4"></CalendarSync>
                  <span class="flex-1 font-medium">All Schedules</span>
                  {#if activeSchedules.length > 0}
                    <Badge variant="secondary" class="h-5 min-w-5 px-1.5 text-xs">
                      {activeSchedules.length}
                    </Badge>
                  {/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton>
              {#snippet child({ props })}
                <a href="/schedules/calendar" {...props} class="flex items-center gap-3">
                  <Calendar class="h-4 w-4"></Calendar>
                  <span class="font-medium">Calendar</span>
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
