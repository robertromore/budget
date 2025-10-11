import {Checkbox} from "$lib/components/ui/checkbox";
import {renderComponent} from "$lib/components/ui/data-table";
import type {BudgetWithRelations} from "$lib/server/domains/budgets";
import type {ColumnDef} from "@tanstack/table-core";
import {formatCurrency} from "$lib/utils/formatters";
import {calculateActualSpent} from "$lib/utils/budget-calculations";
import BudgetProgress from "$lib/components/budgets/budget-progress.svelte";
import BudgetTypeCell from "../(components)/(cells)/budget-type-cell.svelte";
import BudgetStatusCell from "../(components)/(cells)/budget-status-cell.svelte";
import BudgetNameCell from "../(components)/(cells)/budget-name-cell.svelte";
import BudgetRemainingCell from "../(components)/(cells)/budget-remaining-cell.svelte";
import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
import {Button} from "$lib/components/ui/button";
import MoreVertical from "@lucide/svelte/icons/ellipsis-vertical";
import ChartBar from "@lucide/svelte/icons/chart-bar";
import Pencil from "@lucide/svelte/icons/pencil";
import Copy from "@lucide/svelte/icons/copy";
import Archive from "@lucide/svelte/icons/archive";
import Trash2 from "@lucide/svelte/icons/trash-2";

interface BudgetColumnActions {
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
}

function getAllocated(budget: BudgetWithRelations): number {
  const templates = budget.periodTemplates ?? [];
  const periods = templates.flatMap((template) => template.periods ?? []);
  if (!periods.length) return 0;

  const latest = periods.reduce((latest, current) =>
    latest.endDate > current.endDate ? latest : current
  );

  if (latest) return Math.abs(latest.allocatedAmount ?? 0);
  return Math.abs((budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as number ?? 0);
}

function getConsumed(budget: BudgetWithRelations): number {
  return calculateActualSpent(budget);
}

function resolveStatus(budget: BudgetWithRelations) {
  if (budget.status !== "active") return "paused" as const;
  const allocated = getAllocated(budget);
  const consumed = getConsumed(budget);
  if (!allocated) return "paused" as const;

  const ratio = consumed / allocated;
  if (ratio > 1) return "over" as const;
  if (ratio >= 0.8) return "approaching" as const;
  return "on_track" as const;
}

function resolveEnforcement(budget: BudgetWithRelations) {
  return (budget.enforcementLevel ?? "warning") as "none" | "warning" | "strict";
}

export function columns(actions: BudgetColumnActions): ColumnDef<BudgetWithRelations>[] {
  return [
    {
      id: "select-col",
      header: ({table}) => {
        const allPageRowsSelected = table.getIsAllPageRowsSelected();
        const somePageRowsSelected = table.getIsSomePageRowsSelected();

        return renderComponent(Checkbox, {
          checked: allPageRowsSelected,
          indeterminate: somePageRowsSelected && !allPageRowsSelected,
          onCheckedChange: (value) => {
            if (value) {
              table.toggleAllPageRowsSelected(true);
            } else {
              table.toggleAllRowsSelected(false);
            }
          },
          controlledChecked: true,
          "aria-label": "Select all on page",
        });
      },
      cell: ({row}) => {
        return renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value) => row.toggleSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select row",
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      id: "name",
      header: "Name",
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetNameCell, {
          budget,
        });
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      accessorKey: "type",
      id: "type",
      header: "Type",
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetTypeCell, {
          budget,
        });
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      accessorKey: "scope",
      id: "scope",
      header: "Scope",
      cell: (info) => {
        const scope = info.getValue() as string;
        return scope.charAt(0).toUpperCase() + scope.slice(1);
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: "allocated",
      header: "Allocated",
      cell: (info) => {
        const budget = info.row.original;
        const allocated = getAllocated(budget);
        return formatCurrency(allocated);
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = getAllocated(rowA.original);
        const b = getAllocated(rowB.original);
        return a - b;
      },
    },
    {
      id: "consumed",
      header: "Consumed",
      cell: (info) => {
        const budget = info.row.original;
        const consumed = getConsumed(budget);
        return formatCurrency(consumed);
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = getConsumed(rowA.original);
        const b = getConsumed(rowB.original);
        return a - b;
      },
    },
    {
      id: "remaining",
      header: "Remaining",
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetRemainingCell, {
          budget,
        });
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const aRemaining = getAllocated(rowA.original) - getConsumed(rowA.original);
        const bRemaining = getAllocated(rowB.original) - getConsumed(rowB.original);
        return aRemaining - bRemaining;
      },
    },
    {
      id: "progress",
      header: "Progress",
      cell: (info) => {
        const budget = info.row.original;
        const allocated = getAllocated(budget);
        const consumed = getConsumed(budget);
        const status = resolveStatus(budget);
        const enforcement = resolveEnforcement(budget);

        return renderComponent(BudgetProgress, {
          consumed,
          allocated,
          status,
          enforcementLevel: enforcement,
          label: "",
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
    },
    {
      accessorKey: "status",
      id: "status",
      header: "Status",
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetStatusCell, {
          budget,
        });
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: "actions",
      header: "",
      cell: (info) => {
        const budget = info.row.original;

        return renderComponent(DropdownMenu.Root, {
          children: () => [
            renderComponent(DropdownMenu.Trigger, {
              asChild: true,
              children: () => renderComponent(Button, {
                variant: "ghost",
                size: "icon",
                class: "h-8 w-8 p-0",
                children: () => renderComponent(MoreVertical, {
                  class: "h-4 w-4",
                }),
              }),
            }),
            renderComponent(DropdownMenu.Content, {
              align: "end",
              children: () => [
                renderComponent(DropdownMenu.Label, {children: "Actions"}),
                renderComponent(DropdownMenu.Separator, {}),
                renderComponent(DropdownMenu.Item, {
                  onclick: () => actions.onView(budget),
                  children: () => [
                    renderComponent(ChartBar, {class: "mr-2 h-4 w-4"}),
                    "View Details",
                  ],
                }),
                renderComponent(DropdownMenu.Item, {
                  onclick: () => actions.onEdit(budget),
                  children: () => [
                    renderComponent(Pencil, {class: "mr-2 h-4 w-4"}),
                    "Edit Budget",
                  ],
                }),
                renderComponent(DropdownMenu.Separator, {}),
                renderComponent(DropdownMenu.Item, {
                  onclick: () => actions.onDuplicate(budget),
                  children: () => [
                    renderComponent(Copy, {class: "mr-2 h-4 w-4"}),
                    "Duplicate",
                  ],
                }),
                renderComponent(DropdownMenu.Item, {
                  onclick: () => actions.onArchive(budget),
                  children: () => [
                    renderComponent(Archive, {class: "mr-2 h-4 w-4"}),
                    "Archive",
                  ],
                }),
                renderComponent(DropdownMenu.Separator, {}),
                renderComponent(DropdownMenu.Item, {
                  onclick: () => actions.onDelete(budget),
                  class: "text-destructive focus:text-destructive",
                  children: () => [
                    renderComponent(Trash2, {class: "mr-2 h-4 w-4"}),
                    "Delete",
                  ],
                }),
              ],
            }),
          ],
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
