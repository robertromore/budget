import {type Payee} from "$lib/schema";
import {trpc} from "$lib/trpc/client";
import {SvelteMap} from "svelte/reactivity";
import {getContext, setContext} from "svelte";

const KEY = Symbol("payees");

export class PayeesState {
  payees = $state(new SvelteMap<number, Payee>()) as SvelteMap<number, Payee>;

  constructor(payees?: Payee[]) {
    if (payees) {
      this.init(payees);
    }
  }

  // Initialize/reinitialize the store with new data
  init(payees: Payee[]) {
    this.payees.clear();
    payees.forEach((payee) => this.payees.set(payee.id, payee));
  }

  // Context management
  static get() {
    return getContext<PayeesState>(KEY);
  }

  static set(payees: Payee[]) {
    return setContext(KEY, new PayeesState(payees));
  }

  // Getters
  get all(): Payee[] {
    return this.payees.values().toArray();
  }

  get count(): number {
    return this.payees.size;
  }

  // Find operations
  getById(id: number): Payee | undefined {
    return this.payees.get(id);
  }

  findBy(predicate: (payee: Payee) => boolean): Payee | undefined {
    return this.payees.values().find(predicate);
  }

  filterBy(predicate: (payee: Payee) => boolean): Payee[] {
    return this.payees.values().filter(predicate).toArray();
  }

  // Domain-specific methods
  getByName(name: string): Payee | undefined {
    return this.findBy((payee) => payee.name === name);
  }

  getActivePayees(): Payee[] {
    return this.filterBy((payee) => !payee.deletedAt);
  }

  // CRUD operations
  addPayee(payee: Payee) {
    this.payees.set(payee.id, payee);
  }

  updatePayee(payee: Payee) {
    this.payees.set(payee.id, payee);
  }

  removePayee(id: number): Payee | undefined {
    const payee = this.payees.get(id);
    if (payee) {
      this.payees.delete(id);
      return payee;
    }
    return undefined;
  }

  removePayees(ids: number[]): Payee[] {
    const removed: Payee[] = [];
    ids.forEach((id) => {
      const payee = this.payees.get(id);
      if (payee) {
        this.payees.delete(id);
        removed.push(payee);
      }
    });
    return removed;
  }

  // API operations
  async savePayee(payee: Payee): Promise<Payee> {
    const result = await trpc().payeeRoutes.save.mutate(payee);
    this.addPayee(result);
    return result;
  }

  async deletePayee(id: number): Promise<void> {
    await trpc().payeeRoutes.delete.mutate({entities: [id]});
    this.removePayee(id);
  }

  async deletePayees(ids: number[]): Promise<void> {
    await trpc().payeeRoutes.delete.mutate({entities: ids});
    this.removePayees(ids);
  }

  // Utility methods
  has(id: number): boolean {
    return this.payees.has(id);
  }

  clear(): void {
    this.payees.clear();
  }
}
