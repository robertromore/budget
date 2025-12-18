import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import { GenericFacetedFilter, type FacetedFilterOption } from "$lib/components/data-table";
import type { Category } from "$lib/schema";
import type { CategoryWithGroup } from "$lib/server/domains/categories/repository";
import type { CategoriesState } from "$lib/states/entities/categories.svelte";
import { compareAlphanumeric } from "$lib/utils";
import type { Column, ColumnDef, FilterFnOption } from "@tanstack/table-core";
import CategoryActionsCell from "../(components)/(cells)/category-actions-cell.svelte";
import CategoryExpectedRangeCell from "../(components)/(cells)/category-expected-range-cell.svelte";
import CategoryGroupCell from "../(components)/(cells)/category-group-cell.svelte";
import CategoryNameCell from "../(components)/(cells)/category-name-cell.svelte";
import CategoryNotesCell from "../(components)/(cells)/category-notes-cell.svelte";
import CategoryPriorityCell from "../(components)/(cells)/category-priority-cell.svelte";
import CategoryStatusCell from "../(components)/(cells)/category-status-cell.svelte";
import CategoryTaxDeductibleCell from "../(components)/(cells)/category-tax-deductible-cell.svelte";
import CategoryTypeCell from "../(components)/(cells)/category-type-cell.svelte";
import TrendingUp from "@lucide/svelte/icons/trending-up";
import TrendingDown from "@lucide/svelte/icons/trending-down";
import ArrowLeftRight from "@lucide/svelte/icons/arrow-left-right";
import PiggyBank from "@lucide/svelte/icons/piggy-bank";
import Tag from "@lucide/svelte/icons/tag";
import ShieldCheck from "@lucide/svelte/icons/shield-check";
import Star from "@lucide/svelte/icons/star";
import CircleMinus from "@lucide/svelte/icons/circle-minus";
import Gem from "@lucide/svelte/icons/gem";
import CircleCheck from "@lucide/svelte/icons/circle-check";
import CircleX from "@lucide/svelte/icons/circle-x";

// Filter options for category type
const categoryTypeOptions: FacetedFilterOption[] = [
  { label: "Income", value: "income", icon: TrendingUp },
  { label: "Expense", value: "expense", icon: TrendingDown },
  { label: "Transfer", value: "transfer", icon: ArrowLeftRight },
  { label: "Savings", value: "savings", icon: PiggyBank },
];

// Filter options for spending priority
const spendingPriorityOptions: FacetedFilterOption[] = [
  { label: "Essential", value: "essential", icon: ShieldCheck },
  { label: "Important", value: "important", icon: Star },
  { label: "Discretionary", value: "discretionary", icon: CircleMinus },
  { label: "Luxury", value: "luxury", icon: Gem },
];

// Filter options for status (isActive)
const statusOptions: FacetedFilterOption[] = [
  { label: "Active", value: "true", icon: CircleCheck },
  { label: "Inactive", value: "false", icon: CircleX },
];

// Custom filter function for array-based multi-select filters
// Handles both { operator, values } format from GenericFacetedFilter and plain arrays
const arrIncludesFilter = (row: any, columnId: string, filterValue: unknown) => {
  if (!filterValue) return true;

  const value = row.getValue(columnId);
  // Handle boolean values (convert to string for comparison)
  const valueStr = typeof value === "boolean" ? String(value) : value;

  // Handle { operator, values } format from GenericFacetedFilter
  if (typeof filterValue === 'object' && 'values' in filterValue) {
    const { operator, values } = filterValue as { operator: string; values: string[] };
    if (!values || values.length === 0) return true;
    const isIncluded = values.includes(valueStr);
    return operator === 'arrNotIncludesSome' ? !isIncluded : isIncluded;
  }

  // Handle array format
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true;
    return filterValue.includes(valueStr);
  }

  return true;
};

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
          onCheckedChange: (value: boolean) => {
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
          onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
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
      header: "ID",
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
      header: "Name",
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryNameCell, { category });
      },
      sortingFn: (rowA, rowB) =>
        compareAlphanumeric(rowA.original.name || "", rowB.original.name || ""),
      enableColumnFilter: true,
      filterFn: "includesString" as FilterFnOption<CategoryWithGroup>,
      meta: {
        label: "Name",
      },
    },
    {
      accessorKey: "groupName",
      id: "group",
      header: "Group",
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryGroupCell, {
          groupName: category.groupName,
          groupColor: category.groupColor,
          groupIcon: category.groupIcon,
        });
      },
      sortingFn: (rowA, rowB) =>
        compareAlphanumeric(rowA.original.groupName || "", rowB.original.groupName || ""),
      enableColumnFilter: true,
      enableGrouping: true,
      filterFn: "includesString" as FilterFnOption<CategoryWithGroup>,
      meta: {
        label: "Group",
      },
    },
    {
      accessorKey: "categoryType",
      id: "type",
      header: "Type",
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryTypeCell, { categoryType: category.categoryType });
      },
      sortingFn: (rowA, rowB) =>
        compareAlphanumeric(rowA.original.categoryType || "", rowB.original.categoryType || ""),
      enableColumnFilter: true,
      enableGrouping: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: "Type",
        facetedFilter: (column: Column<CategoryWithGroup, unknown>) => ({
          name: "Type",
          icon: Tag,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Type",
              options: categoryTypeOptions,
            }),
        }),
      },
    },
    {
      accessorKey: "spendingPriority",
      id: "priority",
      header: "Priority",
      cell: (info) => {
        const category = info.row.original;
        return renderComponent(CategoryPriorityCell, { priority: category.spendingPriority });
      },
      sortingFn: (rowA, rowB) =>
        compareAlphanumeric(
          rowA.original.spendingPriority || "",
          rowB.original.spendingPriority || ""
        ),
      enableColumnFilter: true,
      enableGrouping: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: "Priority",
        facetedFilter: (column: Column<CategoryWithGroup, unknown>) => ({
          name: "Priority",
          icon: ShieldCheck,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Priority",
              options: spendingPriorityOptions,
            }),
        }),
      },
    },
    {
      accessorKey: "isTaxDeductible",
      id: "taxDeductible",
      header: "Tax Deductible",
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
      header: "Expected Range",
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
      header: "Notes",
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
      // Use accessorFn to convert boolean to string for faceted values (counts)
      accessorFn: (row) => String(row.isActive),
      id: "status",
      header: "Status",
      cell: (info) => {
        const isActive = info.row.original.isActive;
        return renderComponent(CategoryStatusCell, { isActive });
      },
      enableSorting: true,
      enableColumnFilter: true,
      enableGrouping: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: "Status",
        facetedFilter: (column: Column<CategoryWithGroup, unknown>) => ({
          name: "Status",
          icon: CircleCheck,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Status",
              options: statusOptions,
            }),
        }),
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
