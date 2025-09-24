import {UseBoolean} from "$lib/hooks/ui/use-boolean.svelte";
import {UseNumber} from "$lib/hooks/ui/use-number.svelte";

export const newAccountDialog = $state(new UseBoolean(false));
export const managingAccountId = $state(new UseNumber(0));
export const newScheduleDialog = $state(new UseBoolean(false));
export const managingScheduleId = $state(new UseNumber(0));
export const duplicatingSchedule = $state(new UseBoolean(false));
export const editAccountDialog = $state(new UseBoolean(false));
export const deleteAccountDialog = $state(new UseBoolean(false));
export const deleteAccountId = $state(new UseNumber(0));
export const deleteScheduleDialog = $state(new UseBoolean(false));
export const deleteScheduleId = $state(new UseNumber(0));
export const newBudgetDialog = $state(new UseBoolean(false));
export const managingBudgetId = $state(new UseNumber(0));
export const deleteBudgetDialog = $state(new UseBoolean(false));
export const deleteBudgetId = $state(new UseNumber(0));
