import type { EditableEntityItem } from '$lib/components/types';
import {
  type InsertCategorySchema,
  type RemoveCategorySchema,
  type Category,
  insertCategorySchema,
  type removeCategorySchema,
} from '$lib/schema';
import { trpc } from '$lib/trpc/client';
import { without } from '$lib/utils';
import { getContext, setContext } from 'svelte';
import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
import { zodClient } from 'sveltekit-superforms/adapters';

type SetCategoryState = {
  categories: Category[];
  manageCategoryForm: SuperValidated<Infer<InsertCategorySchema>>;
  deleteCategoryForm: SuperValidated<Infer<RemoveCategorySchema>>;
};

export class CategoryState {
  categories: Category[] = $state() as Category[];
  manageCategoryForm: SuperValidated<Infer<InsertCategorySchema>> = $state() as SuperValidated<
    Infer<typeof insertCategorySchema>
  >;
  deleteCategoryForm: SuperValidated<Infer<RemoveCategorySchema>> = $state() as SuperValidated<
    Infer<typeof removeCategorySchema>
  >;

  manageCategorySuperForm(onSave?: (new_value: EditableEntityItem, is_new: boolean) => void) {
    return superForm(this.manageCategoryForm, {
      id: 'category-form',
      validators: zodClient(insertCategorySchema),
      onResult: async ({ result }) => {
        if (!result.data.form || result.status !== 200) {
          return;
        }

        const is_new = result.data.form.data.id !== void 0;
        if (is_new) {
          this.addCategory(result.data.entity);
        } else {
          this.updateCategory(result.data.entity);
        }
        onSave?.(result.data.entity as EditableEntityItem, is_new);
      },
    });
  }

  getById(id: number) {
    return this.categories.find((category) => category.id === id);
  }

  addCategory(category: Category) {
    this.categories.push(category);
  }

  updateCategory(category: Category) {
    const index = this.categories.findIndex((c) => c.id === category.id);
    if (index !== -1) {
      this.categories[index] = category;
    } else {
      this.addCategory(category);
    }
  }

  async deleteCategories(categories: number[], cb?: (id: Category[]) => void) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await trpc().categoriesRoutes.delete.mutate({
      entities: categories
    });
    const removed = without(this.categories, (category: Category) => categories.includes(category.id));
    if (cb) {
      cb(removed);
    }
  }

  async deleteCategory(category: number, cb?: (id: Category[]) => void) {
    return this.deleteCategories([category], cb);
  }

  constructor(init: SetCategoryState) {
    this.categories = init.categories;
    this.manageCategoryForm = init.manageCategoryForm;
    this.deleteCategoryForm = init.deleteCategoryForm;
  }
}

const CATEGORY_CTX = Symbol("CATEGORY_ctx");

export function setCategoryState(init: SetCategoryState) {
  const categoryState = new CategoryState(init);
  setContext<CategoryState>(CATEGORY_CTX, categoryState);
  return categoryState;
}

export function getCategoryState() {
  return getContext<CategoryState>(CATEGORY_CTX);
}
