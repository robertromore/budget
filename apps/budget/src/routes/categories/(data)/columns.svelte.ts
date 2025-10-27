import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import type { Category } from "$lib/schema";
import type { CategoryWithGroup } from "$lib/server/domains/categories/repository";
import type { CategoriesState } from "$lib/states/entities/categories.svelte";
import { compareAlphanumeric } from "$lib/utils";
import type { ColumnDef, FilterFnOption } from "@tanstack/table-core";
import CategoryActionsCell from "../(components)/(cells)/category-actions-cell.svelte";
import CategoryExpectedRangeCell from "../(components)/(cells)/category-expected-range-cell.svelte";
import CategoryGroupCell from "../(components)/(cells)/category-group-cell.svelte";
import CategoryNameCell from "../(components)/(cells)/category-name-cell.svelte";
import CategoryNotesCell from "../(components)/(cells)/category-notes-cell.svelte";
import CategoryPriorityCell from "../(components)/(cells)/category-priority-cell.svelte";
import CategoryStatusCell from "../(components)/(cells)/category-status-cell.svelte";
import CategoryTaxDeductibleCell from "../(components)/(cells)/category-tax-deductible-cell.svelte";
import CategoryTypeCell from "../(components)/(cells)/category-type-cell.svelte";
import CategoryColumnHeader from "../(components)/category-column-header.svelte";

export const columns = (
  _categoriesState: CategoriesState,
  onView: (category: Category) => void,
  onEdit: (category: Category) => void,
  onDelete: (category: Category) => void,
  onViewAnalytics: (category: Category) => void
): ColumnDef<CategoryWithGroup>[] => {
  return [
    {
      id: "select-col",
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
      accessorKey: "id",
      header: ({ column }) =>
        renderComponent(CategoryColumnHeader<CategoryWithGroup, unknown>, {
          column,
          title: "ID",
        }),
      cell: (info) => info.getValue(),
      sortingFn: "alphanumeric",
      enableColumnFilter: false,
      meta: {
        label: "ID",
      },
    },
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) =>
        renderComponent(CategoryColumnHeader<CategoryWithGroup, unknown>, {
          column,
          title: "Name",
        }),
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryNameCell, { category });
      },
      sortingFn: (rowA, rowB) => compareAlphanumeric(rowA.original.name || "", rowB.original.name || ""),
      enableColumnFilter: true,
      filterFn: "includesString" as FilterFnOption<CategoryWithGroup>,
      meta: {
        label: "Name",
      },
    },
    {
      accessorKey: "groupName",
      id: "group",
      header: ({ column }) =>
        renderComponent(CategoryColumnHeader<CategoryWithGroup, unknown>, {
          column,
          title: "Group",
        }),
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryGroupCell, {
          groupName: category.groupName,
          groupColor: category.groupColor,
          groupIcon: category.groupIcon,
        });
      },
      sortingFn: (rowA, rowB) => compareAlphanumeric(rowA.original.groupName || "", rowB.original.groupName || ""),
      enableColumnFilter: true,
      filterFn: "includesString" as FilterFnOption<CategoryWithGroup>,
      meta: {
        label: "Group",
      },
    },
    {
      accessorKey: "categoryType",
      id: "type",
      header: ({ column }) =>
        renderComponent(CategoryColumnHeader<CategoryWithGroup, unknown>, {
          column,
          title: "Type",
        }),
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryTypeCell, { categoryType: category.categoryType });
      },
      sortingFn: (rowA, rowB) => compareAlphanumeric(rowA.original.categoryType || "", rowB.original.categoryType || ""),
      enableColumnFilter: true,
      filterFn: "equalsString" as FilterFnOption<CategoryWithGroup>,
      meta: {
        label: "Type",
      },
    },
    {
      accessorKey: "spendingPriority",
      id: "priority",
      header: ({ column }) =>
        renderComponent(CategoryColumnHeader<CategoryWithGroup, unknown>, {
          column,
          title: "Priority",
        }),
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryPriorityCell, { priority: category.spendingPriority });
      },
      sortingFn: (rowA, rowB) => compareAlphanumeric(rowA.original.spendingPriority || "", rowB.original.spendingPriority || ""),
      enableColumnFilter: true,
      filterFn: "equalsString" as FilterFnOption<CategoryWithGroup>,
      meta: {
        label: "Priority",
      },
    },
    {
      accessorKey: "isTaxDeductible",
      id: "taxDeductible",
      header: ({ column }) =>
        renderComponent(CategoryColumnHeader<CategoryWithGroup, unknown>, {
          column,
          title: "Tax Deductible",
        }),
      cell: (info) => {
        const isTaxDeductible = info.getValue() as boolean;
        return renderComponent(CategoryTaxDeductibleCell, { isTaxDeductible });
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: "equals" as FilterFnOption<CategoryWithGroup>,
      meta: {
        label: "Tax Deductible",
      },
    },
    {
      accessorKey: "expectedMonthlyMin",
      id: "expectedRange",
      header: ({ column }) =>
        renderComponent(CategoryColumnHeader<CategoryWithGroup, unknown>, {
          column,
          title: "Expected Range",
        }),
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryExpectedRangeCell, {
          min: category.expectedMonthlyMin,
          max: category.expectedMonthlyMax,
        });
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const aMin = rowA.original.expectedMonthlyMin || 0;
        const bMin = rowB.original.expectedMonthlyMin || 0;
        return aMin - bMin;
      },
      enableColumnFilter: false,
      meta: {
        label: "Expected Range",
      },
    },
    {
      accessorKey: "notes",
      id: "notes",
      header: ({ column }) =>
        renderComponent(CategoryColumnHeader<CategoryWithGroup, unknown>, {
          column,
          title: "Notes",
        }),
      cell: (info) => {
        const notes = info.getValue() as string | null;
        return renderComponent(CategoryNotesCell, { notes });
      },
      enableSorting: false,
      enableColumnFilter: false,
      meta: {
        label: "Notes",
      },
    },
    {
      accessorKey: "isActive",
      id: "status",
      header: ({ column }) =>
        renderComponent(CategoryColumnHeader<CategoryWithGroup, unknown>, {
          column,
          title: "Status",
        }),
      cell: (info) => {
        const isActive = info.getValue() as boolean;
        return renderComponent(CategoryStatusCell, { isActive });
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: "equals" as FilterFnOption<CategoryWithGroup>,
      meta: {
        label: "Status",
      },
    },
    {
      id: "actions",
      header: "",
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryActionsCell, {
          category,
          onView,
          onEdit,
          onDelete,
          onViewAnalytics,
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
};
