import type {
  Account,
  FormInsertAccountSchema,
  RemoveAccountSchema,
  insertAccountSchema,
  removeAccountSchema
} from '$lib/schema';
import { getContext, setContext } from 'svelte';
import type { Infer, SuperValidated } from 'sveltekit-superforms';

type SetAccountState = {
  accounts: Account[];
  // addAccountForm: SuperValidated<Infer<FormInsertAccountSchema>>;
  // updateAccountForm: SuperValidated<Infer<FormInsertAccountSchema>>;
  manageAccountForm?: SuperValidated<Infer<FormInsertAccountSchema>>;
  deleteAccountForm?: SuperValidated<Infer<RemoveAccountSchema>>;
};

export class AccountState {
  accounts: Account[] = $state() as Account[];
  // addAccountForm: SuperValidated<Infer<FormInsertAccountSchema>> = $state() as SuperValidated<
  //   Infer<typeof insertAccountSchema>
  // >;
  // updateAccountForm: SuperValidated<Infer<FormInsertAccountSchema>> = $state() as SuperValidated<
  //   Infer<typeof insertAccountSchema>
  // >;
  manageAccountForm: SuperValidated<Infer<FormInsertAccountSchema>> = $state() as SuperValidated<
    Infer<typeof insertAccountSchema>
  >;
  deleteAccountForm: SuperValidated<Infer<FormInsertAccountSchema>> = $state() as SuperValidated<
    Infer<typeof removeAccountSchema>
  >;

  constructor(init: SetAccountState) {
    if (init.accounts)
      this.accounts = init.accounts;
    // this.addAccountForm = init.addAccountForm;
    // this.updateAccountForm = init.updateAccountForm;
    if (init.manageAccountForm)
      this.manageAccountForm = init.manageAccountForm;
    if (init.deleteAccountForm)
      this.deleteAccountForm = init.deleteAccountForm;
  }
}

const ACCOUNT_CTX = Symbol("account_ctx");

export function setAccountState(init: SetAccountState) {
  const accountState = new AccountState(init);
  setContext<AccountState>(ACCOUNT_CTX, accountState);
  return accountState;
}

export function getAccountState() {
  return getContext<AccountState>(ACCOUNT_CTX);
}
