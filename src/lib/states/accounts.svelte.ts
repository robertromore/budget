import type {
  Account,
  FormInsertAccountSchema,
  RemoveAccountSchema,
  insertAccountSchema,
  removeAccountSchema,
} from "$lib/schema";
import { getContext, setContext } from "svelte";
import type { Infer, SuperValidated } from "sveltekit-superforms";
import { SvelteSet } from "svelte/reactivity";

type SetAccountsState = {
  accounts?: Account[];
  manageAccountForm?: SuperValidated<Infer<FormInsertAccountSchema>>;
  deleteAccountForm?: SuperValidated<Infer<RemoveAccountSchema>>;
};

export class AccountsState {
  accounts: SvelteSet<Account> = $state() as SvelteSet<Account>;
  manageAccountForm: SuperValidated<Infer<FormInsertAccountSchema>> = $state() as SuperValidated<
    Infer<typeof insertAccountSchema>
  >;
  deleteAccountForm: SuperValidated<Infer<RemoveAccountSchema>> = $state() as SuperValidated<
    Infer<typeof removeAccountSchema>
  >;

  constructor(init: SetAccountsState) {
    if (init.accounts) this.accounts = new SvelteSet(init.accounts);
    if (init.manageAccountForm) this.manageAccountForm = init.manageAccountForm;
    if (init.deleteAccountForm) this.deleteAccountForm = init.deleteAccountForm;
  }

  getById(id: number): Account {
    return [...this.accounts]
      .filter((account: Account) => {
        return account.id == id;
      })
      .shift()!;
  }
}

const ACCOUNT_CTX = Symbol("accounts_ctx");

export function setAccountsState(init: SetAccountsState) {
  const accountState = new AccountsState(init);
  setContext<AccountsState>(ACCOUNT_CTX, accountState);
  return accountState;
}

export function getAccountsState() {
  return getContext<AccountsState>(ACCOUNT_CTX);
}
