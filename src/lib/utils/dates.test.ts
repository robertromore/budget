import { describe, it, expect } from "vitest";
import { CalendarDate } from "@internationalized/date";
import {
  getNextWeekday,
  getNextWeekdayFlexible,
  getNextWeekdayByLabel,
  getFirstWeekday,
  getFirstSpecifiedWeekdayInMonth,
} from "./dates";

describe("Weekday utility functions", () => {
  describe("getNextWeekday", () => {
    it("should find next Monday from a Tuesday", () => {
      // Tuesday, January 16, 2024
      const tuesday = new CalendarDate(2024, 1, 16);
      const nextMonday = getNextWeekday(tuesday, 1);

      // Should be Monday, January 22, 2024
      expect(nextMonday.year).toBe(2024);
      expect(nextMonday.month).toBe(1);
      expect(nextMonday.day).toBe(22);
    });

    it("should find next Friday from a Wednesday", () => {
      // Wednesday, January 17, 2024
      const wednesday = new CalendarDate(2024, 1, 17);
      const nextFriday = getNextWeekday(wednesday, 5);

      // Should be Friday, January 19, 2024
      expect(nextFriday.year).toBe(2024);
      expect(nextFriday.month).toBe(1);
      expect(nextFriday.day).toBe(19);
    });

    it("should find next week if same weekday", () => {
      // Monday, January 15, 2024
      const monday = new CalendarDate(2024, 1, 15);
      const nextMonday = getNextWeekday(monday, 1);

      // Should be Monday, January 22, 2024 (next week)
      expect(nextMonday.year).toBe(2024);
      expect(nextMonday.month).toBe(1);
      expect(nextMonday.day).toBe(22);
    });

    it("should find next Sunday from a Saturday", () => {
      // Saturday, January 20, 2024
      const saturday = new CalendarDate(2024, 1, 20);
      const nextSunday = getNextWeekday(saturday, 0);

      // Should be Sunday, January 21, 2024
      expect(nextSunday.year).toBe(2024);
      expect(nextSunday.month).toBe(1);
      expect(nextSunday.day).toBe(21);
    });

    it("should find next Monday from a Sunday", () => {
      // Sunday, January 21, 2024
      const sunday = new CalendarDate(2024, 1, 21);
      const nextMonday = getNextWeekday(sunday, 1);

      // Should be Monday, January 22, 2024
      expect(nextMonday.year).toBe(2024);
      expect(nextMonday.month).toBe(1);
      expect(nextMonday.day).toBe(22);
    });

    it("should throw error for invalid weekday", () => {
      const date = new CalendarDate(2024, 1, 15);
      expect(() => getNextWeekday(date, -1)).toThrow(
        "Target weekday must be between 0 (Sunday) and 6 (Saturday)"
      );
      expect(() => getNextWeekday(date, 7)).toThrow(
        "Target weekday must be between 0 (Sunday) and 6 (Saturday)"
      );
    });

    it("should handle month boundary", () => {
      // Friday, January 26, 2024
      const friday = new CalendarDate(2024, 1, 26);
      const nextTuesday = getNextWeekday(friday, 2);

      // Should be Tuesday, January 30, 2024
      expect(nextTuesday.year).toBe(2024);
      expect(nextTuesday.month).toBe(1);
      expect(nextTuesday.day).toBe(30);
    });

    it("should handle year boundary", () => {
      // Friday, December 29, 2023
      const friday = new CalendarDate(2023, 12, 29);
      const nextTuesday = getNextWeekday(friday, 2);

      // Should be Tuesday, January 2, 2024
      expect(nextTuesday.year).toBe(2024);
      expect(nextTuesday.month).toBe(1);
      expect(nextTuesday.day).toBe(2);
    });
  });

  describe("getNextWeekdayFlexible", () => {
    it("should exclude same day by default", () => {
      // Monday, January 15, 2024
      const monday = new CalendarDate(2024, 1, 15);
      const nextMonday = getNextWeekdayFlexible(monday, 1);

      // Should be Monday, January 22, 2024 (next week)
      expect(nextMonday.year).toBe(2024);
      expect(nextMonday.month).toBe(1);
      expect(nextMonday.day).toBe(22);
    });

    it("should include same day when requested", () => {
      // Monday, January 15, 2024
      const monday = new CalendarDate(2024, 1, 15);
      const sameMonday = getNextWeekdayFlexible(monday, 1, true);

      // Should be the same day
      expect(sameMonday.year).toBe(2024);
      expect(sameMonday.month).toBe(1);
      expect(sameMonday.day).toBe(15);
    });

    it("should find next occurrence when not same day", () => {
      // Tuesday, January 16, 2024
      const tuesday = new CalendarDate(2024, 1, 16);
      const nextFriday = getNextWeekdayFlexible(tuesday, 5, true);

      // Should be Friday, January 19, 2024
      expect(nextFriday.year).toBe(2024);
      expect(nextFriday.month).toBe(1);
      expect(nextFriday.day).toBe(19);
    });
  });

  describe("getNextWeekdayByLabel", () => {
    it("should work with lowercase labels", () => {
      // Tuesday, January 16, 2024
      const tuesday = new CalendarDate(2024, 1, 16);
      const nextFriday = getNextWeekdayByLabel(tuesday, "friday");

      // Should be Friday, January 19, 2024
      expect(nextFriday.year).toBe(2024);
      expect(nextFriday.month).toBe(1);
      expect(nextFriday.day).toBe(19);
    });

    it("should work with capitalized labels", () => {
      // Wednesday, January 17, 2024
      const wednesday = new CalendarDate(2024, 1, 17);
      const nextMonday = getNextWeekdayByLabel(wednesday, "Monday");

      // Should be Monday, January 22, 2024
      expect(nextMonday.year).toBe(2024);
      expect(nextMonday.month).toBe(1);
      expect(nextMonday.day).toBe(22);
    });

    it("should work with mixed case labels", () => {
      // Thursday, January 18, 2024
      const thursday = new CalendarDate(2024, 1, 18);
      const nextSunday = getNextWeekdayByLabel(thursday, "SuNdAy");

      // Should be Sunday, January 21, 2024
      expect(nextSunday.year).toBe(2024);
      expect(nextSunday.month).toBe(1);
      expect(nextSunday.day).toBe(21);
    });

    it("should include same day when requested", () => {
      // Friday, January 19, 2024
      const friday = new CalendarDate(2024, 1, 19);
      const sameFriday = getNextWeekdayByLabel(friday, "Friday", true);

      // Should be the same day
      expect(sameFriday.year).toBe(2024);
      expect(sameFriday.month).toBe(1);
      expect(sameFriday.day).toBe(19);
    });

    it("should throw error for invalid weekday label", () => {
      const date = new CalendarDate(2024, 1, 15);
      expect(() => getNextWeekdayByLabel(date, "invalid")).toThrow(
        'Invalid weekday label: "invalid"'
      );
      expect(() => getNextWeekdayByLabel(date, "Funday")).toThrow(
        'Invalid weekday label: "Funday"'
      );
    });

    it("should work with all valid weekdays", () => {
      // Start from Monday, January 15, 2024
      const monday = new CalendarDate(2024, 1, 15);

      const tuesday = getNextWeekdayByLabel(monday, "Tuesday");
      expect(tuesday.day).toBe(16);

      const wednesday = getNextWeekdayByLabel(monday, "Wednesday");
      expect(wednesday.day).toBe(17);

      const thursday = getNextWeekdayByLabel(monday, "Thursday");
      expect(thursday.day).toBe(18);

      const friday = getNextWeekdayByLabel(monday, "Friday");
      expect(friday.day).toBe(19);

      const saturday = getNextWeekdayByLabel(monday, "Saturday");
      expect(saturday.day).toBe(20);

      const sunday = getNextWeekdayByLabel(monday, "Sunday");
      expect(sunday.day).toBe(21);

      const nextMonday = getNextWeekdayByLabel(monday, "Monday");
      expect(nextMonday.day).toBe(22);
    });
  });

  describe("getFirstWeekday", () => {
    it("should find first Monday of January 2024", () => {
      // Any Monday in January 2024
      const someMonday = new CalendarDate(2024, 1, 15);
      const firstMonday = getFirstWeekday(someMonday);

      // Should be Monday, January 1, 2024 (first Monday)
      expect(firstMonday.year).toBe(2024);
      expect(firstMonday.month).toBe(1);
      expect(firstMonday.day).toBe(1);
    });

    it("should find first Wednesday of January 2024", () => {
      // Any Wednesday in January 2024
      const someWednesday = new CalendarDate(2024, 1, 17);
      const firstWednesday = getFirstWeekday(someWednesday);

      // Should be Wednesday, January 3, 2024 (first Wednesday)
      expect(firstWednesday.year).toBe(2024);
      expect(firstWednesday.month).toBe(1);
      expect(firstWednesday.day).toBe(3);
    });

    it("should find first Sunday of February 2024", () => {
      // Any Sunday in February 2024
      const someSunday = new CalendarDate(2024, 2, 25);
      const firstSunday = getFirstWeekday(someSunday);

      // Should be Sunday, February 4, 2024 (first Sunday)
      expect(firstSunday.year).toBe(2024);
      expect(firstSunday.month).toBe(2);
      expect(firstSunday.day).toBe(4);
    });

    it("should find first Saturday of March 2024", () => {
      // Any Saturday in March 2024
      const someSaturday = new CalendarDate(2024, 3, 30);
      const firstSaturday = getFirstWeekday(someSaturday);

      // Should be Saturday, March 2, 2024 (first Saturday)
      expect(firstSaturday.year).toBe(2024);
      expect(firstSaturday.month).toBe(3);
      expect(firstSaturday.day).toBe(2);
    });

    it("should work when given the first occurrence of the weekday", () => {
      // Already the first Friday of the month
      const firstFriday = new CalendarDate(2024, 1, 5);
      const result = getFirstWeekday(firstFriday);

      // Should return the same day
      expect(result.year).toBe(2024);
      expect(result.month).toBe(1);
      expect(result.day).toBe(5);
    });

    it("should handle month with weekday starting late in first week", () => {
      // Any Thursday in April 2024 (April 1st is Monday, so first Thursday is April 4th)
      const someThursday = new CalendarDate(2024, 4, 25);
      const firstThursday = getFirstWeekday(someThursday);

      // Should be Thursday, April 4, 2024
      expect(firstThursday.year).toBe(2024);
      expect(firstThursday.month).toBe(4);
      expect(firstThursday.day).toBe(4);
    });
  });

  describe("getFirstWeekdayInMonth", () => {
    it("should find first Monday of January 2024", () => {
      // January 1, 2024 is a Sunday, so first Monday is January 2nd
      const firstMonday = getFirstSpecifiedWeekdayInMonth(2024, 1, 1); // 1 = Monday

      expect(firstMonday.year).toBe(2024);
      expect(firstMonday.month).toBe(1);
      expect(firstMonday.day).toBe(2);
    });

    it("should find first Saturday of August 2025", () => {
      // First Saturday of August 2025 should be August 3rd
      const firstSaturday = getFirstSpecifiedWeekdayInMonth(2025, 8, 6); // 6 = Saturday

      expect(firstSaturday.year).toBe(2025);
      expect(firstSaturday.month).toBe(8);
      expect(firstSaturday.day).toBe(3);
    });

    it("should find first Saturday of September 2025", () => {
      // First Saturday of September 2025 should be September 7th
      const firstSaturday = getFirstSpecifiedWeekdayInMonth(2025, 9, 6); // 6 = Saturday

      expect(firstSaturday.year).toBe(2025);
      expect(firstSaturday.month).toBe(9);
      expect(firstSaturday.day).toBe(7);
    });

    it("should find first Sunday of February 2024", () => {
      // First Sunday of February 2024 should be February 5th
      const firstSunday = getFirstSpecifiedWeekdayInMonth(2024, 2, 0); // 0 = Sunday

      expect(firstSunday.year).toBe(2024);
      expect(firstSunday.month).toBe(2);
      expect(firstSunday.day).toBe(5);
    });

    it("should find first Wednesday of March 2024", () => {
      // First Wednesday of March 2024 should be March 7th
      const firstWednesday = getFirstSpecifiedWeekdayInMonth(2024, 3, 3); // 3 = Wednesday

      expect(firstWednesday.year).toBe(2024);
      expect(firstWednesday.month).toBe(3);
      expect(firstWednesday.day).toBe(7);
    });

    it("should handle all weekdays correctly", () => {
      // Test all weekdays for January 2024
      // January 1, 2024 is a Sunday
      const results = [];
      for (let weekday = 0; weekday <= 6; weekday++) {
        results.push(getFirstSpecifiedWeekdayInMonth(2024, 1, weekday));
      }

      // Sunday (0) = Jan 1, Monday (1) = Jan 2, Tuesday (2) = Jan 3, etc.
      expect(results[0].day).toBe(1); // First Sunday
      expect(results[1].day).toBe(2); // First Monday
      expect(results[2].day).toBe(3); // First Tuesday
      expect(results[3].day).toBe(4); // First Wednesday
      expect(results[4].day).toBe(5); // First Thursday
      expect(results[5].day).toBe(6); // First Friday
      expect(results[6].day).toBe(7); // First Saturday
    });

    it("should work with different timezones", () => {
      const utcResult = getFirstSpecifiedWeekdayInMonth(2024, 6, 1, "UTC"); // First Monday of June 2024
      const localResult = getFirstSpecifiedWeekdayInMonth(2024, 6, 1, "America/New_York");

      // Results should be the same since we're dealing with calendar dates
      expect(utcResult.year).toBe(localResult.year);
      expect(utcResult.month).toBe(localResult.month);
      expect(utcResult.day).toBe(localResult.day);
    });

    it("should handle user's specific example: August 23, 2025 Saturday → First Saturday of September", () => {
      // August 23, 2025 is a Saturday (weekday 6)
      // First Saturday of September 2025 should be September 7th
      const firstSaturdayOfSeptember = getFirstSpecifiedWeekdayInMonth(2025, 9, 6);

      expect(firstSaturdayOfSeptember.year).toBe(2025);
      expect(firstSaturdayOfSeptember.month).toBe(9);
      expect(firstSaturdayOfSeptember.day).toBe(7);
    });
  });
});
