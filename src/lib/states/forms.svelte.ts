import type {
  Account,
  FormInsertAccountSchema,
  RemoveAccountSchema,
  insertAccountSchema,
  removeAccountSchema
} from '$lib/schema';
import type { Infer, SuperValidated } from 'sveltekit-superforms';
import { Context } from 'runed';

type SetFormsState = {
  manageAccountForm?: SuperValidated<Infer<FormInsertAccountSchema>>;
  deleteAccountForm?: SuperValidated<Infer<RemoveAccountSchema>>;
};

export class FormsState {
  manageAccountForm: SuperValidated<Infer<FormInsertAccountSchema>> = $state() as SuperValidated<
    Infer<typeof insertAccountSchema>
  >;
  deleteAccountForm: SuperValidated<Infer<RemoveAccountSchema>> = $state() as SuperValidated<
    Infer<typeof removeAccountSchema>
  >;

  constructor(init: SetFormsState) {
    if (init.manageAccountForm) this.manageAccountForm = init.manageAccountForm;
    if (init.deleteAccountForm) this.deleteAccountForm = init.deleteAccountForm;
  }
}

export const forms_ctx = new Context<FormsState>('forms_ctx');

export function setFormsState(init: SetFormsState) {
  const formsState = new FormsState(init);
  forms_ctx.set(formsState);
  return formsState;
}

export function getFormsState() {
  return forms_ctx.get();
}
