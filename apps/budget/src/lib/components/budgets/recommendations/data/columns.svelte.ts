import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import type { BudgetRecommendationWithRelations } from "$lib/schema/recommendations";
import type { ColumnDef } from "@tanstack/table-core";
import RecommendationColumnHeader from "../recommendation-column-header.svelte";
import RecommendationTitleCell from "../cells/recommendation-title-cell.svelte";
import RecommendationConfidenceCell from "../cells/recommendation-confidence-cell.svelte";
import RecommendationPriorityCell from "../cells/recommendation-priority-cell.svelte";
import RecommendationStatusCell from "../cells/recommendation-status-cell.svelte";
import RecommendationActionsCell from "../cells/recommendation-actions-cell.svelte";

export const columns = (
  onApply: (recommendation: BudgetRecommendationWithRelations) => void,
  onDismiss: (recommendation: BudgetRecommendationWithRelations) => void
): ColumnDef<BudgetRecommendationWithRelations>[] => {
  return [
    {
      id: "select-col",
      size: 50,
      header: ({ table }) => {
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
      cell: ({ row }) => {
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
      accessorKey: "title",
      id: "title",
      size: 200,
      header: ({ column }) =>
        renderComponent(RecommendationColumnHeader<BudgetRecommendationWithRelations, unknown>, {
          column,
          title: "Recommendation",
        }),
      cell: (info) => {
        const recommendation = info.row.original;
        return renderComponent(RecommendationTitleCell, { recommendation });
      },
      sortingFn: "alphanumeric",
      enableColumnFilter: true,
      meta: {
        label: "Recommendation",
      },
    },
    {
      accessorKey: "confidence",
      id: "confidence",
      size: 120,
      header: ({ column }) =>
        renderComponent(RecommendationColumnHeader<BudgetRecommendationWithRelations, unknown>, {
          column,
          title: "Confidence",
        }),
      cell: (info) => {
        const recommendation = info.row.original;
        return renderComponent(RecommendationConfidenceCell, { recommendation });
      },
      sortingFn: "alphanumeric",
      enableColumnFilter: false,
      meta: {
        label: "Confidence",
      },
    },
    {
      accessorKey: "priority",
      id: "priority",
      size: 110,
      header: ({ column }) =>
        renderComponent(RecommendationColumnHeader<BudgetRecommendationWithRelations, unknown>, {
          column,
          title: "Priority",
        }),
      cell: (info) => {
        const recommendation = info.row.original;
        return renderComponent(RecommendationPriorityCell, { recommendation });
      },
      sortingFn: "alphanumeric",
      enableColumnFilter: true,
      meta: {
        label: "Priority",
      },
    },
    {
      accessorKey: "status",
      id: "status",
      size: 110,
      header: ({ column }) =>
        renderComponent(RecommendationColumnHeader<BudgetRecommendationWithRelations, unknown>, {
          column,
          title: "Status",
        }),
      cell: (info) => {
        const recommendation = info.row.original;
        return renderComponent(RecommendationStatusCell, { recommendation });
      },
      sortingFn: "alphanumeric",
      enableColumnFilter: true,
      meta: {
        label: "Status",
      },
    },
    {
      id: "actions",
      size: 180,
      header: () => "",
      cell: (info) => {
        const recommendation = info.row.original;
        return renderComponent(RecommendationActionsCell, {
          recommendation,
          onApply,
          onDismiss,
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
};
