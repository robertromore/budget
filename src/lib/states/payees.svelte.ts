import { type Payee } from '$lib/schema';
import { trpc } from '$lib/trpc/client';
import { without } from '$lib/utils';
import { Context } from 'runed';

export class PayeesState {
  payees: Payee[] = $state() as Payee[];

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
    await trpc().payeeRoutes.delete.mutate({
      entities: payees
    });
    const [, removed] = without(this.payees, (payee: Payee) => payees.includes(payee.id));
    if (cb) {
      cb(removed);
    }
  }

  async deletePayee(payee: number) {
    return this.deletePayees([payee]);
  }

  constructor(payees: Payee[]) {
    this.payees = payees;
  }
}

export const payeesContext = new Context<PayeesState>('payees');
