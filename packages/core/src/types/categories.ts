import type { Category } from "../schema/categories";

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
