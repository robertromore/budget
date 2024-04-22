import type { EditableEntityItem } from '$lib/components/types';
import {
  type FormInsertPayeeSchema,
  type RemovePayeeSchema,
  type Payee,
  insertPayeeSchema,
  type removePayeeSchema,
} from '$lib/schema';
import { trpc } from '$lib/trpc/client';
import { without } from '$lib/utils';
import { getContext, setContext } from 'svelte';
import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
import { zodClient } from 'sveltekit-superforms/adapters';

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

  managePayeeSuperForm(onSave?: (new_value: EditableEntityItem, is_new: boolean) => void) {
    return superForm(this.managePayeeForm, {
      id: 'category-form',
      validators: zodClient(insertPayeeSchema),
      onResult: async ({ result }) => {
        if (!result.data.form || result.status !== 200) {
          return;
        }

        const is_new = result.data.form.data.id !== void 0;
        if (is_new) {
          this.addPayee(result.data.entity);
        } else {
          this.updatePayee(result.data.entity);
        }
        onSave?.(result.data.entity as EditableEntityItem, is_new);
      }
    });
  }

  getById(id: number) {
    return this.payees.find((payee) => payee.id === id);
  }

  addPayee(payee: Payee) {
    this.payees.push(payee);
  }

  updatePayee(payee: Payee) {
    const index = this.payees.findIndex((c) => c.id === payee.id);
    if (index !== -1) {
      this.payees[index] = payee;
    } else {
      this.addPayee(payee);
    }
  }

  async deletePayees(payees: number[], cb?: (id: Payee[]) => void) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await trpc().payeeRoutes.delete.mutate({
      entities: payees
    });
    const removed = without(this.payees, (payee: Payee) => payees.includes(payee.id));
    if (cb) {
      cb(removed);
    }
  }

  async deletePayee(payee: number) {
    return this.deletePayees([payee]);
  }

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
