import type {
  InsertCategorySchema,
  RemoveCategorySchema,
  Category,
  insertCategorySchema,
  removeCategorySchema,
} from '$lib/schema';
import { getContext, setContext } from 'svelte';
import type { Infer, SuperValidated } from 'sveltekit-superforms';

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
