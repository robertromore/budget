import {describe, test, expect, beforeEach} from "bun:test";
import type {Schedule} from "$lib/schema";

// Mock schedules data for testing
const mockSchedules: Schedule[] = [
  {
    id: 1,
    name: "Monthly Salary",
    slug: "monthly-salary",
    status: "active",
    amount: 5000,
    amount_2: 0,
    amount_type: "exact",
    recurring: true,
    auto_add: true,
    dateId: 1,
    payeeId: 1,
    accountId: 1,
    createdAt: "2023-01-01T10:00:00Z",
    updatedAt: "2023-01-01T10:00:00Z",
    transactions: [],
    account: null,
    payee: null,
    scheduleDate: null,
  },
  {
    id: 2,
    name: "Weekly Groceries",
    slug: "weekly-groceries",
    status: "active",
    amount: 150,
    amount_2: 200,
    amount_type: "range",
    recurring: true,
    auto_add: false,
    dateId: 2,
    payeeId: 2,
    accountId: 1,
    createdAt: "2023-02-01T12:00:00Z",
    updatedAt: "2023-02-01T12:00:00Z",
    transactions: [],
    account: null,
    payee: null,
    scheduleDate: null,
  },
  {
    id: 3,
    name: "Old Subscription",
    slug: "old-subscription",
    status: "inactive",
    amount: 29.99,
    amount_2: 0,
    amount_type: "exact",
    recurring: true,
    auto_add: false,
    dateId: 3,
    payeeId: 3,
    accountId: 2,
    createdAt: "2022-12-01T08:00:00Z",
    updatedAt: "2023-01-15T14:30:00Z",
    transactions: [],
    account: null,
    payee: null,
    scheduleDate: null,
  },
  {
    id: 4,
    name: "Approximate Utilities",
    slug: "approximate-utilities",
    status: "active",
    amount: 100,
    amount_2: 0,
    amount_type: "approximate",
    recurring: true,
    auto_add: true,
    dateId: null,
    payeeId: 4,
    accountId: 1,
    createdAt: "2023-03-01T16:45:00Z",
    updatedAt: "2023-03-01T16:45:00Z",
    transactions: [],
    account: null,
    payee: null,
    scheduleDate: null,
  },
  {
    id: 5,
    name: "One-time Payment",
    slug: "one-time-payment",
    status: "active",
    amount: 500,
    amount_2: 0,
    amount_type: "exact",
    recurring: false,
    auto_add: false,
    dateId: null,
    payeeId: 5,
    accountId: 2,
    createdAt: "2023-04-01T11:20:00Z",
    updatedAt: "2023-04-01T11:20:00Z",
    transactions: [],
    account: null,
    payee: null,
    scheduleDate: null,
  },
];

// Simple test implementation that doesn't use Svelte runes for unit testing
class TestSchedulesState {
  schedules = new Map<number, Schedule>();

  constructor(schedules?: Schedule[]) {
    if (schedules) {
      this.init(schedules);
    }
  }

  init(schedules: Schedule[]) {
    this.schedules.clear();
    schedules.forEach((schedule) => this.schedules.set(schedule.id, schedule));
  }

  get all(): Schedule[] {
    return Array.from(this.schedules.values());
  }

  get count(): number {
    return this.schedules.size;
  }

  getById(id: number): Schedule | undefined {
    return this.schedules.get(id);
  }

  findBy(predicate: (schedule: Schedule) => boolean): Schedule | undefined {
    return this.all.find(predicate);
  }

  filterBy(predicate: (schedule: Schedule) => boolean): Schedule[] {
    return this.all.filter(predicate);
  }

  getByName(name: string): Schedule | undefined {
    return this.findBy((schedule) => schedule.name === name);
  }

  getActiveSchedules(): Schedule[] {
    return this.filterBy((schedule) => schedule.status === "active");
  }

  getInactiveSchedules(): Schedule[] {
    return this.filterBy((schedule) => schedule.status === "inactive");
  }

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

  has(id: number): boolean {
    return this.schedules.has(id);
  }

  clear(): void {
    this.schedules.clear();
  }
}

describe("SchedulesState", () => {
  let schedulesState: TestSchedulesState;

  beforeEach(() => {
    schedulesState = new TestSchedulesState(mockSchedules);
  });

  describe("Initialization", () => {
    test("should initialize with schedule data", () => {
      expect(schedulesState.all).toHaveLength(5);
      expect(schedulesState.count).toBe(5);
    });

    test("should initialize empty when no data provided", () => {
      const emptyState = new TestSchedulesState();
      expect(emptyState.all).toHaveLength(0);
      expect(emptyState.count).toBe(0);
    });

    test("should reinitialize with new data", () => {
      const newSchedules = [mockSchedules[0], mockSchedules[1]];
      schedulesState.init(newSchedules);
      expect(schedulesState.all).toHaveLength(2);
      expect(schedulesState.count).toBe(2);
    });
  });

  describe("Basic Getters", () => {
    test("should return all schedules", () => {
      const all = schedulesState.all;
      expect(all).toHaveLength(5);
      expect(all.map((s) => s.id).sort()).toEqual([1, 2, 3, 4, 5]);
    });

    test("should return correct count", () => {
      expect(schedulesState.count).toBe(5);
    });
  });

  describe("Find Operations", () => {
    test("should find schedule by ID", () => {
      const schedule = schedulesState.getById(1);
      expect(schedule).toBeDefined();
      expect(schedule?.name).toBe("Monthly Salary");
      expect(schedule?.id).toBe(1);
    });

    test("should return undefined for non-existent ID", () => {
      const schedule = schedulesState.getById(999);
      expect(schedule).toBeUndefined();
    });

    test("should find schedule by predicate", () => {
      const schedule = schedulesState.findBy((s) => s.amount_type === "range");
      expect(schedule).toBeDefined();
      expect(schedule?.name).toBe("Weekly Groceries");
      expect(schedule?.amount_type).toBe("range");
    });

    test("should return undefined when predicate matches nothing", () => {
      const schedule = schedulesState.findBy((s) => s.name === "Non-existent");
      expect(schedule).toBeUndefined();
    });

    test("should filter schedules by predicate", () => {
      const exactSchedules = schedulesState.filterBy((s) => s.amount_type === "exact");
      expect(exactSchedules).toHaveLength(3);
      expect(exactSchedules.map((s) => s.name)).toEqual([
        "Monthly Salary",
        "Old Subscription",
        "One-time Payment",
      ]);
    });

    test("should return empty array when filter matches nothing", () => {
      const noMatches = schedulesState.filterBy((s) => s.amount > 10000);
      expect(noMatches).toHaveLength(0);
    });
  });

  describe("Domain-Specific Methods", () => {
    test("should find schedule by name", () => {
      const schedule = schedulesState.getByName("Monthly Salary");
      expect(schedule).toBeDefined();
      expect(schedule?.id).toBe(1);
      expect(schedule?.name).toBe("Monthly Salary");
    });

    test("should return undefined for non-existent name", () => {
      const schedule = schedulesState.getByName("Non-existent Schedule");
      expect(schedule).toBeUndefined();
    });

    test("should get active schedules only", () => {
      const activeSchedules = schedulesState.getActiveSchedules();
      expect(activeSchedules).toHaveLength(4);

      const names = activeSchedules.map((s) => s.name);
      expect(names).toEqual([
        "Monthly Salary",
        "Weekly Groceries",
        "Approximate Utilities",
        "One-time Payment",
      ]);

      // Verify all are active
      activeSchedules.forEach((schedule) => {
        expect(schedule.status).toBe("active");
      });
    });

    test("should get inactive schedules only", () => {
      const inactiveSchedules = schedulesState.getInactiveSchedules();
      expect(inactiveSchedules).toHaveLength(1);
      expect(inactiveSchedules[0].name).toBe("Old Subscription");
      expect(inactiveSchedules[0].status).toBe("inactive");
    });

    test("should return empty array when no active schedules exist", () => {
      const allInactiveSchedules = mockSchedules.map((s) => ({...s, status: "inactive" as const}));
      const inactiveState = new TestSchedulesState(allInactiveSchedules);

      const activeSchedules = inactiveState.getActiveSchedules();
      expect(activeSchedules).toHaveLength(0);
    });

    test("should return empty array when no inactive schedules exist", () => {
      const allActiveSchedules = mockSchedules.map((s) => ({...s, status: "active" as const}));
      const activeState = new TestSchedulesState(allActiveSchedules);

      const inactiveSchedules = activeState.getInactiveSchedules();
      expect(inactiveSchedules).toHaveLength(0);
    });
  });

  describe("CRUD Operations", () => {
    test("should add new schedule", () => {
      const newSchedule: Schedule = {
        id: 6,
        name: "New Schedule",
        slug: "new-schedule",
        status: "active",
        amount: 250,
        amount_2: 0,
        amount_type: "exact",
        recurring: false,
        auto_add: false,
        dateId: null,
        payeeId: 1,
        accountId: 1,
        createdAt: "2023-05-01T10:00:00Z",
        updatedAt: "2023-05-01T10:00:00Z",
        transactions: [],
        account: null,
        payee: null,
        scheduleDate: null,
      };

      schedulesState.addSchedule(newSchedule);

      expect(schedulesState.count).toBe(6);
      expect(schedulesState.getById(6)).toEqual(newSchedule);
      expect(schedulesState.has(6)).toBe(true);
    });

    test("should update existing schedule", () => {
      const updatedSchedule: Schedule = {
        ...mockSchedules[0],
        name: "Updated Monthly Salary",
        amount: 5500,
        updatedAt: "2023-06-01T12:00:00Z",
      };

      schedulesState.updateSchedule(updatedSchedule);

      const retrieved = schedulesState.getById(1);
      expect(retrieved?.name).toBe("Updated Monthly Salary");
      expect(retrieved?.amount).toBe(5500);
      expect(retrieved?.updatedAt).toBe("2023-06-01T12:00:00Z");
      expect(schedulesState.count).toBe(5); // Count should remain the same
    });

    test("should add new schedule when updating non-existent ID", () => {
      const newSchedule: Schedule = {
        id: 999,
        name: "New Via Update",
        slug: "new-via-update",
        status: "active",
        amount: 100,
        amount_2: 0,
        amount_type: "exact",
        recurring: false,
        auto_add: false,
        dateId: null,
        payeeId: 1,
        accountId: 1,
        createdAt: "2023-05-01T10:00:00Z",
        updatedAt: "2023-05-01T10:00:00Z",
        transactions: [],
        account: null,
        payee: null,
        scheduleDate: null,
      };

      schedulesState.updateSchedule(newSchedule);

      expect(schedulesState.count).toBe(6);
      expect(schedulesState.getById(999)).toEqual(newSchedule);
    });

    test("should remove schedule by ID", () => {
      const removedSchedule = schedulesState.removeSchedule(1);

      expect(removedSchedule).toBeDefined();
      expect(removedSchedule?.id).toBe(1);
      expect(removedSchedule?.name).toBe("Monthly Salary");
      expect(schedulesState.count).toBe(4);
      expect(schedulesState.getById(1)).toBeUndefined();
      expect(schedulesState.has(1)).toBe(false);
    });

    test("should return undefined when removing non-existent schedule", () => {
      const removedSchedule = schedulesState.removeSchedule(999);

      expect(removedSchedule).toBeUndefined();
      expect(schedulesState.count).toBe(5); // Count should remain the same
    });

    test("should remove multiple schedules", () => {
      const idsToRemove = [1, 3, 5];
      const removedSchedules = schedulesState.removeSchedules(idsToRemove);

      expect(removedSchedules).toHaveLength(3);
      expect(removedSchedules.map((s) => s.id).sort()).toEqual([1, 3, 5]);
      expect(schedulesState.count).toBe(2);

      // Verify specific schedules were removed
      expect(schedulesState.getById(1)).toBeUndefined();
      expect(schedulesState.getById(3)).toBeUndefined();
      expect(schedulesState.getById(5)).toBeUndefined();

      // Verify remaining schedules
      expect(schedulesState.getById(2)).toBeDefined();
      expect(schedulesState.getById(4)).toBeDefined();
    });

    test("should handle partial removal when some IDs don't exist", () => {
      const idsToRemove = [1, 999, 3, 888];
      const removedSchedules = schedulesState.removeSchedules(idsToRemove);

      expect(removedSchedules).toHaveLength(2); // Only 1 and 3 exist
      expect(removedSchedules.map((s) => s.id).sort()).toEqual([1, 3]);
      expect(schedulesState.count).toBe(3);
    });

    test("should return empty array when removing non-existent schedules", () => {
      const idsToRemove = [999, 888, 777];
      const removedSchedules = schedulesState.removeSchedules(idsToRemove);

      expect(removedSchedules).toHaveLength(0);
      expect(schedulesState.count).toBe(5); // Count should remain the same
    });
  });

  describe("Utility Methods", () => {
    test("should check if schedule exists", () => {
      expect(schedulesState.has(1)).toBe(true);
      expect(schedulesState.has(5)).toBe(true);
      expect(schedulesState.has(999)).toBe(false);
    });

    test("should clear all schedules", () => {
      schedulesState.clear();

      expect(schedulesState.count).toBe(0);
      expect(schedulesState.all).toHaveLength(0);
      expect(schedulesState.getActiveSchedules()).toHaveLength(0);
      expect(schedulesState.getInactiveSchedules()).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    test("should handle schedule with null dateId", () => {
      const scheduleWithNullDate = schedulesState.getById(4);
      expect(scheduleWithNullDate?.dateId).toBeNull();
      expect(scheduleWithNullDate?.name).toBe("Approximate Utilities");
    });

    test("should handle different amount types", () => {
      const exactSchedule = schedulesState.findBy((s) => s.amount_type === "exact");
      const approximateSchedule = schedulesState.findBy((s) => s.amount_type === "approximate");
      const rangeSchedule = schedulesState.findBy((s) => s.amount_type === "range");

      expect(exactSchedule).toBeDefined();
      expect(approximateSchedule).toBeDefined();
      expect(rangeSchedule).toBeDefined();

      expect(rangeSchedule?.amount_2).toBeGreaterThan(rangeSchedule?.amount || 0);
    });

    test("should handle recurring and non-recurring schedules", () => {
      const recurringSchedules = schedulesState.filterBy((s) => s.recurring);
      const nonRecurringSchedules = schedulesState.filterBy((s) => !s.recurring);

      expect(recurringSchedules).toHaveLength(4);
      expect(nonRecurringSchedules).toHaveLength(1);
      expect(nonRecurringSchedules[0].name).toBe("One-time Payment");
    });

    test("should handle auto_add flags correctly", () => {
      const autoAddSchedules = schedulesState.filterBy((s) => s.auto_add);
      const manualSchedules = schedulesState.filterBy((s) => !s.auto_add);

      expect(autoAddSchedules).toHaveLength(2);
      expect(manualSchedules).toHaveLength(3);

      const autoAddNames = autoAddSchedules.map((s) => s.name).sort();
      expect(autoAddNames).toEqual(["Approximate Utilities", "Monthly Salary"]);
    });

    test("should handle empty state operations gracefully", () => {
      const emptyState = new TestSchedulesState();

      expect(emptyState.getById(1)).toBeUndefined();
      expect(emptyState.findBy((s) => s.name === "test")).toBeUndefined();
      expect(emptyState.filterBy((s) => s.status === "active")).toHaveLength(0);
      expect(emptyState.getActiveSchedules()).toHaveLength(0);
      expect(emptyState.getInactiveSchedules()).toHaveLength(0);
      expect(emptyState.removeSchedule(1)).toBeUndefined();
      expect(emptyState.removeSchedules([1, 2, 3])).toHaveLength(0);
      expect(emptyState.has(1)).toBe(false);
    });
  });

  describe("Data Integrity", () => {
    test("should maintain data consistency after multiple operations", () => {
      // Perform multiple operations
      const newSchedule: Schedule = {
        id: 10,
        name: "Test Schedule",
        slug: "test-schedule",
        status: "active",
        amount: 100,
        amount_2: 0,
        amount_type: "exact",
        recurring: true,
        auto_add: false,
        dateId: null,
        payeeId: 1,
        accountId: 1,
        createdAt: "2023-05-01T10:00:00Z",
        updatedAt: "2023-05-01T10:00:00Z",
        transactions: [],
        account: null,
        payee: null,
        scheduleDate: null,
      };

      schedulesState.addSchedule(newSchedule);
      schedulesState.removeSchedule(3);
      schedulesState.updateSchedule({...newSchedule, amount: 200});

      expect(schedulesState.count).toBe(5); // 5 original - 1 removed + 1 added
      expect(schedulesState.getById(10)?.amount).toBe(200);
      expect(schedulesState.getById(3)).toBeUndefined();
      expect(schedulesState.has(10)).toBe(true);
    });

    test("should not mutate original data when returning arrays", () => {
      const originalAll = schedulesState.all;
      const originalActive = schedulesState.getActiveSchedules();

      // Modify returned arrays
      originalAll.push({} as Schedule);
      originalActive.push({} as Schedule);

      // Verify internal state wasn't affected
      expect(schedulesState.all).toHaveLength(5);
      expect(schedulesState.getActiveSchedules()).toHaveLength(4);
    });
  });
});
