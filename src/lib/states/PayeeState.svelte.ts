import type {
  FormInsertPayeeSchema,
  RemovePayeeSchema,
  Payee,
  insertPayeeSchema,
  removePayeeSchema,
} from '$lib/schema';
import { getContext, setContext } from 'svelte';
import type { Infer, SuperValidated } from 'sveltekit-superforms';

type SetPayeeState = {
  payees: Payee[];
  managePayeeForm: SuperValidated<Infer<FormInsertPayeeSchema>>;
  deletePayeeForm: SuperValidated<Infer<RemovePayeeSchema>>;
};

export class PayeeState {
  payees: Payee[] = $state() as Payee[];
  managePayeeForm: SuperValidated<Infer<FormInsertPayeeSchema>> = $state() as SuperValidated<
    Infer<typeof insertPayeeSchema>
  >;
  deletePayeeForm: SuperValidated<Infer<RemovePayeeSchema>> = $state() as SuperValidated<
    Infer<typeof removePayeeSchema>
  >;

  constructor(init: SetPayeeState) {
    this.payees = init.payees;
    this.managePayeeForm = init.managePayeeForm;
    this.deletePayeeForm = init.deletePayeeForm;
  }
}

const PAYEE_CTX = Symbol("PAYEE_ctx");

export function setPayeeState(init: SetPayeeState) {
  const payeeState = new PayeeState(init);
  setContext<PayeeState>(PAYEE_CTX, payeeState);
  return payeeState;
}

export function getPayeeState() {
  return getContext<PayeeState>(PAYEE_CTX);
}
