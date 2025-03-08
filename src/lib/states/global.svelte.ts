import { UseBoolean } from "$lib/hooks/use-boolean.svelte";
import { UseNumber } from "$lib/hooks/use-number.svelte";
import { UseType } from "$lib/hooks/use-type.svelte";
import { AccountsState } from "./accounts.svelte";

export const newAccountDialog = $state(new UseBoolean(false));
export const managingAccountId = $state(new UseNumber(0));
export const editAccountDialog = $state(new UseBoolean(false));
export const deleteAccountDialog = $state(new UseBoolean(false));
export const deleteAccountId = $state(new UseNumber(0));
export const accountsState = $state(new UseType<AccountsState>());
