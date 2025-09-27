import {UseBoolean} from "$lib/hooks/ui/use-boolean.svelte";
import {UseNumber} from "$lib/hooks/ui/use-number.svelte";

export const newCategoryDialog = $state(new UseBoolean(false));
export const managingCategoryId = $state(new UseNumber(0));
export const deleteCategoryDialog = $state(new UseBoolean(false));
export const deleteCategoryId = $state(new UseNumber(0));