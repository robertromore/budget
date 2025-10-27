<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Select from "$lib/components/ui/select";
  import {
    Undo2,
    CheckCircle2,
    XCircle,
    Clock,
    RotateCcw,
    AlertCircle,
    TrendingUp,
    Users,
    GitMerge,
    Settings2
  } from "@lucide/svelte/icons";
  import type { BudgetAutomationActivity } from "$lib/schema/budget-automation-settings";

  interface Props {
    activities: BudgetAutomationActivity[];
    onRollback: (activityId: number) => Promise<void>;
    onRefresh?: () => void;
  }

  let { activities, onRollback, onRefresh }: Props = $props();

  // Filter state
  let statusFilter = $state<string>("all");
  let actionTypeFilter = $state<string>("all");
  let isRollingBack = $state<Record<number, boolean>>({});

  // Filtered activities
  const filteredActivities = $derived(() => {
    let filtered = activities;

    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    if (actionTypeFilter !== "all") {
      filtered = filtered.filter((a) => a.actionType === actionTypeFilter);
    }

    return filtered;
  });

  async function handleRollback(activityId: number) {
    isRollingBack[activityId] = true;

    try {
      await onRollback(activityId);
      onRefresh?.();
    } catch (error) {
      console.error("Failed to rollback automation:", error);
    } finally {
      isRollingBack[activityId] = false;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "success":
        return CheckCircle2;
      case "failed":
        return XCircle;
      case "rolled_back":
        return RotateCcw;
      default:
        return Clock;
    }
  }

  function getStatusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "success":
        return "default";
      case "failed":
        return "destructive";
      case "rolled_back":
        return "secondary";
      default:
        return "outline";
    }
  }

  function getActionIcon(actionType: string) {
    switch (actionType) {
      case "create_group":
        return Users;
      case "assign_to_group":
        return TrendingUp;
      case "adjust_limit":
        return Settings2;
      case "merge_groups":
        return GitMerge;
      default:
        return AlertCircle;
    }
  }

  function getActionLabel(actionType: string): string {
    switch (actionType) {
      case "create_group":
        return "Create Group";
      case "assign_to_group":
        return "Assign to Group";
      case "adjust_limit":
        return "Adjust Limit";
      case "merge_groups":
        return "Merge Groups";
      default:
        return actionType;
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  function getBudgetCount(budgetIds: number[] | null): string {
    if (!budgetIds) return "—";
    const count = budgetIds.length;
    return `${count} budget${count === 1 ? "" : "s"}`;
  }
</script>

<div class="space-y-4">
  <!-- Header with filters -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <div>
          <Card.Title>Automation Activity Log</Card.Title>
          <Card.Description>
            Track all automated actions and rollback if needed
          </Card.Description>
        </div>
        {#if onRefresh}
          <Button variant="outline" size="sm" onclick={onRefresh} class="gap-2">
            <RotateCcw class="h-4 w-4" />
            Refresh
          </Button>
        {/if}
      </div>
    </Card.Header>
    <Card.Content>
      <div class="flex gap-3">
        <!-- Status filter -->
        <div class="flex-1">
          <Select.Root type="single" bind:value={statusFilter}>
            <Select.Trigger class="w-full">
              {statusFilter === "all" ? "All statuses" :
               statusFilter === "pending" ? "Pending" :
               statusFilter === "success" ? "Success" :
               statusFilter === "failed" ? "Failed" : "Rolled back"}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All statuses</Select.Item>
              <Select.Item value="pending">Pending</Select.Item>
              <Select.Item value="success">Success</Select.Item>
              <Select.Item value="failed">Failed</Select.Item>
              <Select.Item value="rolled_back">Rolled back</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <!-- Action type filter -->
        <div class="flex-1">
          <Select.Root type="single" bind:value={actionTypeFilter}>
            <Select.Trigger class="w-full">
              {actionTypeFilter === "all" ? "All actions" : getActionLabel(actionTypeFilter)}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All actions</Select.Item>
              <Select.Item value="create_group">Create Group</Select.Item>
              <Select.Item value="assign_to_group">Assign to Group</Select.Item>
              <Select.Item value="adjust_limit">Adjust Limit</Select.Item>
              <Select.Item value="merge_groups">Merge Groups</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Activity table -->
  <div class="rounded-md border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-[140px]">Action</Table.Head>
          <Table.Head class="w-[120px]">Status</Table.Head>
          <Table.Head>Budgets</Table.Head>
          <Table.Head>Group</Table.Head>
          <Table.Head>Date</Table.Head>
          <Table.Head class="text-right w-[100px]">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if filteredActivities().length > 0}
          {#each filteredActivities() as activity (activity.id)}
            <Table.Row>
              <!-- Action type -->
              <Table.Cell>
                <div class="flex items-center gap-2">
                  {#if getActionIcon(activity.actionType)}
                    {@const ActionIcon = getActionIcon(activity.actionType)}
                    <ActionIcon class="h-4 w-4 text-muted-foreground" />
                  {/if}
                  <span class="text-sm font-medium">
                    {getActionLabel(activity.actionType)}
                  </span>
                </div>
              </Table.Cell>

              <!-- Status -->
              <Table.Cell>
                <Badge variant={getStatusColor(activity.status)} class="gap-1.5">
                  {#if getStatusIcon(activity.status)}
                    {@const StatusIcon = getStatusIcon(activity.status)}
                    <StatusIcon class="h-3 w-3" />
                  {/if}
                  {activity.status === "rolled_back" ? "Rolled back" :
                   activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                </Badge>
              </Table.Cell>

              <!-- Budget count -->
              <Table.Cell>
                <span class="text-sm text-muted-foreground">
                  {getBudgetCount(activity.budgetIds as number[] | null)}
                </span>
              </Table.Cell>

              <!-- Group ID -->
              <Table.Cell>
                {#if activity.groupId}
                  <span class="text-sm">Group #{activity.groupId}</span>
                {:else}
                  <span class="text-sm text-muted-foreground">—</span>
                {/if}
              </Table.Cell>

              <!-- Date -->
              <Table.Cell>
                <div class="text-sm">
                  <div>{formatDate(activity.createdAt)}</div>
                  {#if activity.rolledBackAt}
                    <div class="text-xs text-muted-foreground mt-0.5">
                      Rolled back: {formatDate(activity.rolledBackAt)}
                    </div>
                  {/if}
                </div>
              </Table.Cell>

              <!-- Actions -->
              <Table.Cell class="text-right">
                {#if activity.status === "success" && !activity.rolledBackAt}
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => handleRollback(activity.id)}
                    disabled={isRollingBack[activity.id]}
                    class="gap-1.5"
                  >
                    {#if isRollingBack[activity.id]}
                      <svg class="h-3 w-3 animate-spin" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    {:else}
                      <Undo2 class="h-3 w-3" />
                    {/if}
                    Undo
                  </Button>
                {:else if activity.status === "failed"}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    class="gap-1.5 text-muted-foreground cursor-not-allowed"
                  >
                    <AlertCircle class="h-3 w-3" />
                    {activity.errorMessage || "Failed"}
                  </Button>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        {:else}
          <Table.Row>
            <Table.Cell colspan={6} class="h-32 text-center">
              <div class="flex flex-col items-center gap-2">
                <Clock class="h-8 w-8 text-muted-foreground" />
                <p class="text-sm text-muted-foreground">
                  {statusFilter === "all" && actionTypeFilter === "all"
                    ? "No automation activity yet"
                    : "No activities match your filters"}
                </p>
              </div>
            </Table.Cell>
          </Table.Row>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Stats summary -->
  {#if activities.length > 0}
    <Card.Root class="bg-muted/50">
      <Card.Content class="pt-6">
        <div class="grid grid-cols-4 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold">
              {activities.filter((a) => a.status === "success").length}
            </div>
            <div class="text-xs text-muted-foreground">Successful</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">
              {activities.filter((a) => a.status === "pending").length}
            </div>
            <div class="text-xs text-muted-foreground">Pending</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">
              {activities.filter((a) => a.status === "failed").length}
            </div>
            <div class="text-xs text-muted-foreground">Failed</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold">
              {activities.filter((a) => a.status === "rolled_back").length}
            </div>
            <div class="text-xs text-muted-foreground">Rolled Back</div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
