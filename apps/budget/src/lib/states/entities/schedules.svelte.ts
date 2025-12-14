import type { Schedule } from "$lib/schema";
import { rpc } from "$lib/query";
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";

const KEY = Symbol("schedules");

export class SchedulesState {
  schedules = $state(new SvelteMap<number, Schedule>()) as SvelteMap<number, Schedule>;

  constructor(schedules?: Schedule[]) {
    if (schedules) {
      this.init(schedules);
    }
  }

  // Initialize/reinitialize the store with new data
  init(schedules: Schedule[]) {
    this.schedules.clear();
    schedules.forEach((schedule) => this.schedules.set(schedule.id, schedule));
  }

  static get() {
    return getContext<SchedulesState>(KEY);
  }

  static set(schedules: Schedule[]) {
    return setContext(KEY, new SchedulesState(schedules));
  }

  // Getters
  get all(): Schedule[] {
    return Array.from(this.schedules.values());
  }

  get count(): number {
    return this.schedules.size;
  }

  // Find operations
  getById(id: number): Schedule | undefined {
    return this.schedules.get(id);
  }

  findBy(predicate: (schedule: Schedule) => boolean): Schedule | undefined {
    return Array.from(this.schedules.values()).find(predicate);
  }

  filterBy(predicate: (schedule: Schedule) => boolean): Schedule[] {
    return Array.from(this.schedules.values()).filter(predicate);
  }

  // Domain-specific methods
  getByName(name: string): Schedule | undefined {
    return this.findBy((schedule) => schedule.name === name);
  }

  getBySlug(slug: string): Schedule | undefined {
    return this.findBy((schedule) => schedule.slug === slug);
  }

  getActiveSchedules(): Schedule[] {
    return this.filterBy((schedule) => schedule.status === "active");
  }

  getInactiveSchedules(): Schedule[] {
    return this.filterBy((schedule) => schedule.status === "inactive");
  }

  // CRUD operations
  addSchedule(schedule: Schedule) {
    this.schedules.set(schedule.id, schedule);
  }

  updateSchedule(schedule: Schedule) {
    this.schedules.set(schedule.id, schedule);
  }

  removeSchedule(id: number): Schedule | undefined {
    const schedule = this.schedules.get(id);
    if (schedule) {
      this.schedules.delete(id);
      return schedule;
    }
    return undefined;
  }

  removeSchedules(ids: number[]): Schedule[] {
    const removed: Schedule[] = [];
    ids.forEach((id) => {
      const schedule = this.schedules.get(id);
      if (schedule) {
        this.schedules.delete(id);
        removed.push(schedule);
      }
    });
    return removed;
  }

  // API operations
  async saveSchedule(schedule: Schedule): Promise<Schedule> {
    // Convert null to undefined for the mutation
    const scheduleForMutation = {
      ...schedule,
      status: schedule.status ?? undefined,
      recurring: schedule.recurring ?? undefined,
      auto_add: schedule.auto_add ?? undefined,
    };
    const result = await rpc.schedules.save.execute(scheduleForMutation);
    this.addSchedule(result);
    return result;
  }

  async deleteSchedule(id: number): Promise<void> {
    await rpc.schedules.remove().execute(id);
    this.removeSchedule(id);
  }

  async deleteSchedules(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id) => this.deleteSchedule(id)));
  }

  // Utility methods
  has(id: number): boolean {
    return this.schedules.has(id);
  }

  clear(): void {
    this.schedules.clear();
  }
}
