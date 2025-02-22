import { UseBoolean } from '$lib/hooks/use-boolean.svelte';
import { Context } from 'runed';

export const newAccountDialog = new Context<UseBoolean>('new_account_dialog');
