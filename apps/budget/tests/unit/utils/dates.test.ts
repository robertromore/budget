import {describe, it, expect} from "bun:test";
import {CalendarDate} from "@internationalized/date";
import {
  getNextWeekday,
  getNextWeekdayFlexible,
  getNextWeekdayByLabel,
  getFirstWeekday,
  getFirstSpecifiedWeekdayInMonth,
  ensureDateValue,
  dateValueToJSDate,
} from "../../../src/lib/utils/dates";

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
      // January 1, 2024 is a Monday, so first Monday is January 1st
      const firstMonday = getFirstSpecifiedWeekdayInMonth(2024, 1, 1); // 1 = Monday

      expect(firstMonday.year).toBe(2024);
      expect(firstMonday.month).toBe(1);
      expect(firstMonday.day).toBe(1);
    });

    it("should find first Saturday of August 2025", () => {
      // August 1, 2025 is Friday, so first Saturday is August 2nd
      const firstSaturday = getFirstSpecifiedWeekdayInMonth(2025, 8, 6); // 6 = Saturday

      expect(firstSaturday.year).toBe(2025);
      expect(firstSaturday.month).toBe(8);
      expect(firstSaturday.day).toBe(2);
    });

    it("should find first Saturday of September 2025", () => {
      // September 1, 2025 is Monday, so first Saturday is September 6th
      const firstSaturday = getFirstSpecifiedWeekdayInMonth(2025, 9, 6); // 6 = Saturday

      expect(firstSaturday.year).toBe(2025);
      expect(firstSaturday.month).toBe(9);
      expect(firstSaturday.day).toBe(6);
    });

    it("should find first Sunday of February 2024", () => {
      // February 1, 2024 is Thursday, so first Sunday is February 4th
      const firstSunday = getFirstSpecifiedWeekdayInMonth(2024, 2, 0); // 0 = Sunday

      expect(firstSunday.year).toBe(2024);
      expect(firstSunday.month).toBe(2);
      expect(firstSunday.day).toBe(4);
    });

    it("should find first Wednesday of March 2024", () => {
      // March 1, 2024 is Friday, so first Wednesday is March 6th
      const firstWednesday = getFirstSpecifiedWeekdayInMonth(2024, 3, 3); // 3 = Wednesday

      expect(firstWednesday.year).toBe(2024);
      expect(firstWednesday.month).toBe(3);
      expect(firstWednesday.day).toBe(6);
    });

    it("should handle all weekdays correctly", () => {
      // Test all weekdays for January 2024
      // January 1, 2024 is a Sunday
      const results = [];
      for (let weekday = 0; weekday <= 6; weekday++) {
        results.push(getFirstSpecifiedWeekdayInMonth(2024, 1, weekday));
      }

      // January 1, 2024 is Monday, so: Sunday (0) = Jan 7, Monday (1) = Jan 1, Tuesday (2) = Jan 2, etc.
      expect(results[0].day).toBe(7); // First Sunday
      expect(results[1].day).toBe(1); // First Monday
      expect(results[2].day).toBe(2); // First Tuesday
      expect(results[3].day).toBe(3); // First Wednesday
      expect(results[4].day).toBe(4); // First Thursday
      expect(results[5].day).toBe(5); // First Friday
      expect(results[6].day).toBe(6); // First Saturday
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
      // First Saturday of September 2025 should be September 6th
      const firstSaturdayOfSeptember = getFirstSpecifiedWeekdayInMonth(2025, 9, 6);

      expect(firstSaturdayOfSeptember.year).toBe(2025);
      expect(firstSaturdayOfSeptember.month).toBe(9);
      expect(firstSaturdayOfSeptember.day).toBe(6);
    });
  });
});

describe("DateValue utility functions", () => {
  describe("ensureDateValue", () => {
    it("should pass through valid CalendarDate objects", () => {
      const originalDate = new CalendarDate(2024, 3, 15);
      const result = ensureDateValue(originalDate);

      expect(result).toBe(originalDate);
      expect(result.year).toBe(2024);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
    });

    it("should parse ISO date strings", () => {
      const result = ensureDateValue("2024-03-15");

      expect(result.year).toBe(2024);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
    });

    it("should parse Date objects", () => {
      const jsDate = new Date(2024, 2, 15); // Note: JS Date months are 0-indexed
      const result = ensureDateValue(jsDate);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(3); // CalendarDate months are 1-indexed
      expect(result.day).toBe(15);
    });

    it("should parse date-like strings", () => {
      const result = ensureDateValue("2024-12-25");

      expect(result.year).toBe(2024);
      expect(result.month).toBe(12);
      expect(result.day).toBe(25);
    });

    it("should handle edge cases with current date fallback", () => {
      // Test with various invalid inputs that should fall back to current date
      const invalidInputs = [null, undefined, "", "invalid-date", NaN, {}];

      invalidInputs.forEach((input) => {
        const result = ensureDateValue(input);
        // Should return a valid CalendarDate (current date)
        expect(result).toBeDefined();
        expect(result.year).toBeGreaterThan(2020);
        expect(result.month).toBeGreaterThanOrEqual(1);
        expect(result.month).toBeLessThanOrEqual(12);
        expect(result.day).toBeGreaterThanOrEqual(1);
        expect(result.day).toBeLessThanOrEqual(31);
      });
    });

    it("should handle numeric inputs", () => {
      // Timestamp for March 15, 2024
      const timestamp = new Date(2024, 2, 15).getTime();
      const result = ensureDateValue(timestamp);

      expect(result.year).toBe(2024);
      expect(result.month).toBe(3);
      expect(result.day).toBe(15);
    });

    it("should handle various string date formats", () => {
      const formats = [
        {input: "2024-01-01", expected: {year: 2024, month: 1, day: 1}},
        {input: "2024-12-31", expected: {year: 2024, month: 12, day: 31}},
        {input: "2023-06-15", expected: {year: 2023, month: 6, day: 15}},
      ];

      formats.forEach(({input, expected}) => {
        const result = ensureDateValue(input);
        expect(result.year).toBe(expected.year);
        expect(result.month).toBe(expected.month);
        expect(result.day).toBe(expected.day);
      });
    });

    it("should preserve timezone independence", () => {
      // Test that the same input produces consistent results regardless of system timezone
      const isoString = "2024-03-15";
      const result1 = ensureDateValue(isoString);
      const result2 = ensureDateValue(isoString);

      expect(result1.year).toBe(result2.year);
      expect(result1.month).toBe(result2.month);
      expect(result1.day).toBe(result2.day);
    });
  });

  describe("dateValueToJSDate", () => {
    it("should convert CalendarDate to JS Date with UTC timezone", () => {
      const calendarDate = new CalendarDate(2024, 3, 15);
      const result = dateValueToJSDate(calendarDate);

      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(2); // JS Date months are 0-indexed
      expect(result.getUTCDate()).toBe(15);
    });

    it("should convert with UTC timezone by default", () => {
      const calendarDate = new CalendarDate(2024, 12, 25);
      const result = dateValueToJSDate(calendarDate);

      // Check UTC components
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(11); // December = 11 in JS
      expect(result.getUTCDate()).toBe(25);
      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
      expect(result.getUTCMilliseconds()).toBe(0);
    });

    it("should respect specified timezone", () => {
      const calendarDate = new CalendarDate(2024, 6, 15);
      const utcResult = dateValueToJSDate(calendarDate, "UTC");
      const localResult = dateValueToJSDate(calendarDate, "America/New_York");

      // Both should be Date objects but potentially different times
      expect(utcResult).toBeInstanceOf(Date);
      expect(localResult).toBeInstanceOf(Date);

      // UTC should have the exact date components
      expect(utcResult.getUTCFullYear()).toBe(2024);
      expect(utcResult.getUTCMonth()).toBe(5); // June = 5 in JS
      expect(utcResult.getUTCDate()).toBe(15);
    });

    it("should handle edge dates correctly", () => {
      const testCases = [
        new CalendarDate(2024, 1, 1), // Start of year
        new CalendarDate(2024, 12, 31), // End of year
        new CalendarDate(2024, 2, 29), // Leap year day
        new CalendarDate(2000, 1, 1), // Y2K
        new CalendarDate(1970, 1, 1), // Unix epoch
      ];

      testCases.forEach((calendarDate) => {
        const result = dateValueToJSDate(calendarDate);

        expect(result).toBeInstanceOf(Date);
        expect(result.getUTCFullYear()).toBe(calendarDate.year);
        expect(result.getUTCMonth()).toBe(calendarDate.month - 1); // Convert 1-indexed to 0-indexed
        expect(result.getUTCDate()).toBe(calendarDate.day);
      });
    });

    it("should maintain consistency with ensureDateValue round-trip", () => {
      // Test round-trip: Date -> CalendarDate -> Date
      const originalDate = new Date(2024, 5, 15); // June 15, 2024
      const calendarDate = ensureDateValue(originalDate);
      const convertedBack = dateValueToJSDate(calendarDate);

      // Should have same date components (time components may differ)
      expect(convertedBack.getUTCFullYear()).toBe(originalDate.getFullYear());
      expect(convertedBack.getUTCMonth()).toBe(originalDate.getMonth());
      expect(convertedBack.getUTCDate()).toBe(originalDate.getDate());
    });

    it("should handle various CalendarDate inputs", () => {
      const testCases = [
        {year: 2024, month: 1, day: 15},
        {year: 2025, month: 7, day: 4},
        {year: 2023, month: 12, day: 31},
        {year: 2024, month: 2, day: 29}, // Leap year
      ];

      testCases.forEach(({year, month, day}) => {
        const calendarDate = new CalendarDate(year, month, day);
        const result = dateValueToJSDate(calendarDate);

        expect(result.getUTCFullYear()).toBe(year);
        expect(result.getUTCMonth()).toBe(month - 1); // Convert to 0-indexed
        expect(result.getUTCDate()).toBe(day);
      });
    });

    it("should produce valid Date objects for chart compatibility", () => {
      // Test that the resulting Date objects work properly in chart contexts
      const dates = [
        new CalendarDate(2024, 1, 1),
        new CalendarDate(2024, 6, 15),
        new CalendarDate(2024, 12, 31),
      ];

      const results = dates.map((date) => dateValueToJSDate(date));

      // All should be valid Date objects
      results.forEach((date) => {
        expect(date).toBeInstanceOf(Date);
        expect(date.getTime()).toBeGreaterThan(0);
        expect(date.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      // Should be sortable
      const sortedResults = [...results].sort((a, b) => a.getTime() - b.getTime());
      expect(sortedResults[0]!.getTime()).toBeLessThanOrEqual(sortedResults[1]!.getTime());
      expect(sortedResults[1]!.getTime()).toBeLessThanOrEqual(sortedResults[2]!.getTime());
    });
  });

  describe("Integration tests for DateValue utilities", () => {
    it("should work together in chart data transformation pipeline", () => {
      // Simulate the actual usage pattern in chart data transformations
      const mockData = [
        {date: "2024-01-15", value: 100},
        {date: new Date(2024, 1, 15), value: 200},
        {date: new CalendarDate(2024, 3, 15), value: 300},
      ];

      const transformedData = mockData.map((item) => {
        const dateValue = ensureDateValue(item.date);
        const jsDate = dateValueToJSDate(dateValue);
        return {
          x: jsDate,
          y: item.value,
          metadata: {dateValue, originalDate: item.date},
        };
      });

      // All should have valid Date objects for x values
      transformedData.forEach((item, index) => {
        expect(item.x).toBeInstanceOf(Date);
        expect(item.y).toBe(mockData[index]!.value);
        expect(item.metadata.dateValue.day).toBe(15);
        expect(item.metadata.dateValue.year).toBe(2024);
      });

      // Should be sortable for chart rendering
      const sorted = transformedData.sort((a, b) => a.x.getTime() - b.x.getTime());
      expect(sorted[0]!.x.getTime()).toBeLessThanOrEqual(sorted[1]!.x.getTime());
      expect(sorted[1]!.x.getTime()).toBeLessThanOrEqual(sorted[2]!.x.getTime());
    });

    it("should handle edge cases in chart data transformation", () => {
      const edgeCaseData = [
        {date: null, value: 100},
        {date: undefined, value: 200},
        {date: "", value: 300},
        {date: "invalid", value: 400},
      ];

      edgeCaseData.forEach((item) => {
        const dateValue = ensureDateValue(item.date);
        const jsDate = dateValueToJSDate(dateValue);

        // Should not throw and produce valid dates
        expect(dateValue).toBeDefined();
        expect(jsDate).toBeInstanceOf(Date);
        expect(jsDate.getTime()).toBeGreaterThan(0);
      });
    });

    it("should maintain consistent behavior across different input types", () => {
      // Test that different representations of the same date produce equivalent results
      const targetDate = new CalendarDate(2024, 6, 15);
      const inputs = [
        targetDate,
        "2024-06-15",
        new Date(2024, 5, 15), // June = 5 in JS Date
        new Date(2024, 5, 15).getTime(),
      ];

      const results = inputs.map((input) => {
        const dateValue = ensureDateValue(input);
        return dateValueToJSDate(dateValue);
      });

      // All results should represent the same day
      const firstResult = results[0]!;
      results.forEach((result) => {
        expect(result.getUTCFullYear()).toBe(firstResult.getUTCFullYear());
        expect(result.getUTCMonth()).toBe(firstResult.getUTCMonth());
        expect(result.getUTCDate()).toBe(firstResult.getUTCDate());
      });
    });
  });
});
