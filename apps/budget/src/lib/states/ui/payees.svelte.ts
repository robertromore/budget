import {UseBoolean} from "$lib/hooks/ui/use-boolean.svelte";
import {UseNumber} from "$lib/hooks/ui/use-number.svelte";

export const newPayeeDialog = $state(new UseBoolean(false));
export const managingPayeeId = $state(new UseNumber(0));
export const deletePayeeDialog = $state(new UseBoolean(false));
export const deletePayeeId = $state(new UseNumber(0));
