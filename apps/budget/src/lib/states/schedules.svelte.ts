import type { Schedule } from "$lib/schema";
import { rpc } from "$lib/query";
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";

const KEY = Symbol("schedules");

export class SchedulesState {
  schedules: SvelteMap<number, Schedule> = $state() as SvelteMap<number, Schedule>;

  constructor(schedules: Schedule[]) {
    this.schedules = new SvelteMap(schedules.map((schedule) => [schedule.id, schedule]));
  }

  static get() {
    return getContext<SchedulesState>(KEY);
  }

  static set(schedules: Schedule[]) {
    return setContext(KEY, new SchedulesState(schedules));
  }

  getById(id: number): Schedule {
    return Array.from(this.schedules.values()).find((schedule: Schedule) => {
      return schedule.id == id;
    })!;
  }

  addSchedule(schedule: Schedule) {
    this.schedules.set(schedule.id, schedule);
  }

  async deleteSchedule(id: number) {
    this.schedules.delete(id);
    await rpc.schedules.remove().execute(id);
  }
}
