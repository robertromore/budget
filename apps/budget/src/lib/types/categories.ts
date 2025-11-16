import type { Category } from "$lib/schema/categories";

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
